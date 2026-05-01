import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductSnapshotAtSummaryTransformer } from "./ShoppingMallProductSnapshotAtSummaryTransformer";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";

export namespace ShoppingMallProductVariantSnapshotTransformer {
  export type Payload =
    Prisma.shopping_mall_product_variant_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        option_values: true,
        price: true,
        stock_quantity: true,
        created_at: true,
        variant: ShoppingMallProductVariantAtSummaryTransformer.select(),
        productSnapshot:
          ShoppingMallProductSnapshotAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_product_variant_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariantSnapshot> {
    return {
      id: input.id,
      variant: await ShoppingMallProductVariantAtSummaryTransformer.transform(
        input.variant,
      ),
      productSnapshot: input.productSnapshot
        ? await ShoppingMallProductSnapshotAtSummaryTransformer.transform(
            input.productSnapshot,
          )
        : null,
      sku_code: input.sku_code,
      option_values: input.option_values,
      price: input.price,
      stock_quantity: input.stock_quantity,
      created_at: input.created_at.toISOString(),
    } satisfies IShoppingMallProductVariantSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallProductVariantSnapshotTransformer {
//       export type Payload = Prisma.shopping_mall_product_variant_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             sku_code: true,
//             option_values: true,
//             price: true,
//             stock_quantity: true,
//             created_at: true,
//             variant: ShoppingMallProductVariantAtSummaryTransformer.select(),
//             productSnapshot: ShoppingMallProductSnapshotAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_product_variant_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallProductVariantSnapshot> {
//         return {
//   id: {string},
//   variant: await ShoppingMallProductVariantAtSummaryTransformer.transform(input.variant),
//   productSnapshot: input.productSnapshot ? await ShoppingMallProductSnapshotAtSummaryTransformer.transform(input.productSnapshot) : null,
//   sku_code: {string},
//   option_values: {string},
//   price: {number | null},
//   stock_quantity: {integer},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------