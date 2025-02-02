// import { SelectQueryBuilder } from 'typeorm';

// export function checkIsJsonb(
//     qb: SelectQueryBuilder<unknown>,
//     propertyName: string,
// ): boolean {
//     if (!qb || !propertyName) {
//         return false;
//     }

//     if (propertyName.includes('.')) {
//         const parts = propertyName.split('.');
//         const dbColumnName = parts[parts.length - 2];

//         return (
//             qb?.expressionMap?.mainAlias?.metadata.findColumnWithPropertyName(
//                 dbColumnName,
//             )?.type === 'json'
//         );
//     }

//     return (
//         qb?.expressionMap?.mainAlias?.metadata.findColumnWithPropertyName(
//             propertyName,
//         )?.type === 'json'
//     );
// }
