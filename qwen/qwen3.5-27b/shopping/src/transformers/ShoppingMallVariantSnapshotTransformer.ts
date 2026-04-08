import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantSnapshot";
import { IShoppingMallVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantSnapshotOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallVariantSnapshotOptionTransformer } from "./ShoppingMallVariantSnapshotOptionTransformer";

export namespace ShoppingMallVariantSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_variant_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        price: true,
        created_at: true,
        productVariant: { select: { id: true } },
        variantSnapshotOptions:
          ShoppingMallVariantSnapshotOptionTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_variant_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallVariantSnapshot> {
    return {
      id: input.id,
      sku_code: input.sku_code,
      price: input.price,
      created_at: input.created_at.toISOString(),
      variantSnapshotOptions: await ArrayUtil.asyncMap(
        input.variantSnapshotOptions,
        ShoppingMallVariantSnapshotOptionTransformer.transform,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallVariantSnapshotTransformer {
//       export type Payload = Prisma.shopping_mall_variant_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             sku_code: true,
//             price: true,
//             created_at: true,
//             shopping_mall_product_variant_id: true,
//             variantSnapshotOptions: ShoppingMallVariantSnapshotOptionTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_variant_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallVariantSnapshot> {
//         return {
//   id: {string},
//   sku_code: {string},
//   price: {number},
//   created_at: {string},
//   variantSnapshotOptions: await ArrayUtil.asyncMap(input.variantSnapshotOptions, ShoppingMallVariantSnapshotOptionTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------