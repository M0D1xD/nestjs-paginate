export const multipleSplit = (param: string, res: any[]) => {
    const items = param.split(':');
    if (items.length === 2) {
        res.push(items as [string, string]);
    }
};
