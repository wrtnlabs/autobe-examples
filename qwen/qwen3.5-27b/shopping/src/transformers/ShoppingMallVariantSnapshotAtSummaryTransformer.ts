import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";

export namespace ShoppingMallVariantSnapshotAtSummaryTransformer {
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
        productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_variant_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallVariantSnapshot.ISummary> {
    return {
      id: input.id,
      sku_code: input.sku_code,
      price: input.price,
      created_at: input.created_at.toISOString(),
      productVariant:
        await ShoppingMallProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallVariantSnapshotAtSummaryTransformer {
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
//             productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_variant_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallVariantSnapshot.ISummary> {
//         return {
//   id: {string},
//   sku_code: {string},
//   price: {number},
//   created_at: {string},
//   productVariant: await ShoppingMallProductVariantAtSummaryTransformer.transform(input.productVariant),
//         };
//       }
//     }
//--------------------------------------------------------------