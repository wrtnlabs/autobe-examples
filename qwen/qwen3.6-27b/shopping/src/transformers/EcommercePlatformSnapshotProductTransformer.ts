import { IEcommercePlatformSnapshotProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommercePlatformSnapshotProductTransformer {
  export type Payload = Prisma.ecommerce_platform_snapshot_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name_previous: true,
        name_current: true,
        description_previous: true,
        description_current: true,
        category_id_current: true,
        snapshot: {
          select: {
            entity_type: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_platform_snapshotsFindManyArgs,
        product: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_platform_productsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_platform_snapshot_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformSnapshotProduct> {
    return {
      id: input.id,
      entityType: input.snapshot.entity_type,
      createdAt: input.snapshot.created_at.toISOString(),
      productId: input.product.id,
      namePrevious: input.name_previous ?? null,
      nameCurrent: input.name_current,
      descriptionPrevious: input.description_previous ?? null,
      descriptionCurrent: input.description_current ?? null,
      categoryIdCurrent: input.category_id_current ?? null,
    } satisfies IEcommercePlatformSnapshotProduct;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformSnapshotProductTransformer {
//       export type Payload = Prisma.ecommerce_platform_snapshot_productsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name_previous: true,
//             name_current: true,
//             description_previous: true,
//             description_current: true,
//             category_id_current: true,
//             ecommerce_platform_snapshot_id: true,
//             ecommerce_platform_product_id: true,
//           },
//         } satisfies Prisma.ecommerce_platform_snapshot_productsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformSnapshotProduct> {
//         return {
//   id: {string},
//   entityType: {string},
//   createdAt: {string},
//   productId: {string},
//   namePrevious: {string | null},
//   nameCurrent: {string},
//   descriptionPrevious: {string | null},
//   descriptionCurrent: {string | null},
//   categoryIdCurrent: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------