import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariant";
import { IShoppingMallProductSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductSnapshotVariantOptionTransformer } from "./ShoppingMallProductSnapshotVariantOptionTransformer";

export namespace ShoppingMallProductSnapshotVariantTransformer {
  export type Payload =
    Prisma.shopping_mall_product_snapshot_variantsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        price: true,
        created_at: true,
        productSnapshot: true,
        options: ShoppingMallProductSnapshotVariantOptionTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_product_snapshot_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshotVariant> {
    return {
      id: input.id,
      sku_code: input.sku_code,
      price: input.price,
      options: await ArrayUtil.asyncMap(
        input.options,
        ShoppingMallProductSnapshotVariantOptionTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallProductSnapshotVariantTransformer {
//       export type Payload = Prisma.shopping_mall_product_snapshot_variantsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             sku_code: true,
//             price: true,
//             created_at: true,
//             shopping_mall_product_snapshot_id: true,
//             options: ShoppingMallProductSnapshotVariantOptionTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_product_snapshot_variantsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallProductSnapshotVariant> {
//         return {
//   id: {string},
//   sku_code: {string},
//   price: {number | null},
//   options: await ArrayUtil.asyncMap(input.options, ShoppingMallProductSnapshotVariantOptionTransformer.transform),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------