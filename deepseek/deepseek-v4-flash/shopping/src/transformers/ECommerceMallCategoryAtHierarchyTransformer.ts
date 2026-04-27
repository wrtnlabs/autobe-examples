import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallCategoryAtHierarchyNodeTransformer } from "./ECommerceMallCategoryAtHierarchyNodeTransformer";

export namespace ECommerceMallCategoryAtHierarchyTransformer {
  export type Payload = Prisma.e_commerce_mall_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return ECommerceMallCategoryAtHierarchyNodeTransformer.select();
  }
  export async function transform(
    input: Payload[],
  ): Promise<IECommerceMallCategory.IHierarchy> {
    return {
      topLevelCategories: await ArrayUtil.asyncMap(input, (elem) =>
        ECommerceMallCategoryAtHierarchyNodeTransformer.transform(elem),
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallCategoryAtHierarchyTransformer {
//       export type Payload = Prisma.e_commerce_mall_categoriesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             ...
//           },
//         } satisfies Prisma.e_commerce_mall_categoriesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallCategory.IHierarchy> {
//         return {
//   topLevelCategories: {Array<IECommerceMallCategory.IHierarchyNode>},
//         };
//       }
//     }
//--------------------------------------------------------------