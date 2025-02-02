export const multipleAndCommaSplit = (param: string, res: any[]) => {
    const set = new Set<string>(param.split(','));
    set.forEach((item) => res.push(item));
};
