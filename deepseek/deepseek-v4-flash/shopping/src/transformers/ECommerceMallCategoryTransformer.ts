import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallCategoryAtSummaryTransformer } from "./ECommerceMallCategoryAtSummaryTransformer";

export namespace ECommerceMallCategoryTransformer {
  export type Payload = Prisma.e_commerce_mall_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent: ECommerceMallCategoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallCategory> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      parent: input.parent
        ? await ECommerceMallCategoryAtSummaryTransformer.transform(
            input.parent,
          )
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IECommerceMallCategory;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallCategoryTransformer {
//       export type Payload = Prisma.e_commerce_mall_categoriesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             parent_id: true,
//             ...
//           },
//         } satisfies Prisma.e_commerce_mall_categoriesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallCategory> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string},
//   parent: {IECommerceMallCategory.ISummary | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------