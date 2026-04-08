import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallCategoriesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesSnapshot";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdministratorAtSummaryTransformer } from "./EcommerceMallAdministratorAtSummaryTransformer";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";

export namespace EcommerceMallCategoriesSnapshotTransformer {
  export type Payload = Prisma.ecommerce_mall_categories_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        entity_type: true,
        entity_id: true,
        name: true,
        description: true,
        created_at: true,
        category: EcommerceMallCategoryAtSummaryTransformer.select(),
        parentCategory: EcommerceMallCategoryAtSummaryTransformer.select(),
        modifiedBy: EcommerceMallAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_categories_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCategoriesSnapshot> {
    return {
      id: input.id,
      entity_type: "category" as const,
      entity_id: input.entity_id,
      name: input.name,
      description: input.description,
      created_at: input.created_at.toISOString(),
      category: await EcommerceMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      modifiedBy:
        await EcommerceMallAdministratorAtSummaryTransformer.transform(
          input.modifiedBy,
        ),
      parentCategory: input.parentCategory
        ? await EcommerceMallCategoryAtSummaryTransformer.transform(
            input.parentCategory,
          )
        : undefined,
    } satisfies IEcommerceMallCategoriesSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCategoriesSnapshotTransformer {
//       export type Payload = Prisma.ecommerce_mall_categories_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             entity_type: true,
//             entity_id: true,
//             name: true,
//             description: true,
//             created_at: true,
//             category_id: true,
//             parent_category_id: true,
//             modifiedBy: EcommerceMallAdministratorAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_categories_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCategoriesSnapshot> {
//         return {
//   id: {string},
//   entity_type: {"category"},
//   entity_id: {string},
//   name: {string},
//   description: {string},
//   created_at: {string},
//   category: {IEcommerceMallCategory.ISummary},
//   modifiedBy: await EcommerceMallAdministratorAtSummaryTransformer.transform(input.modifiedBy),
//   parentCategory: {IEcommerceMallCategory.ISummary | null},
//         };
//       }
//     }
//--------------------------------------------------------------