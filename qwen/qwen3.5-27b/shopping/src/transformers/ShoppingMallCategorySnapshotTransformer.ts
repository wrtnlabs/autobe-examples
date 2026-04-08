import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategorySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCategorySnapshotTransformer {
  export type Payload = Prisma.shopping_mall_category_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name_before: true,
        name_after: true,
        description_before: true,
        description_after: true,
        parent_category_id_before: true,
        parent_category_id_after: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_category_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCategorySnapshot> {
    return {
      id: input.id,
      name_before: input.name_before,
      name_after: input.name_after,
      description_before: input.description_before,
      description_after: input.description_after,
      parent_category_id_before: input.parent_category_id_before,
      parent_category_id_after: input.parent_category_id_after,
      created_at: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallCategorySnapshotTransformer {
//       export type Payload = Prisma.shopping_mall_category_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name_before: true,
//             name_after: true,
//             description_before: true,
//             description_after: true,
//             parent_category_id_before: true,
//             parent_category_id_after: true,
//             created_at: true,
//             shopping_mall_category_id: true,
//           },
//         } satisfies Prisma.shopping_mall_category_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallCategorySnapshot> {
//         return {
//   id: {string},
//   name_before: {string},
//   name_after: {string},
//   description_before: {string},
//   description_after: {string},
//   parent_category_id_before: {string | null},
//   parent_category_id_after: {string | null},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------