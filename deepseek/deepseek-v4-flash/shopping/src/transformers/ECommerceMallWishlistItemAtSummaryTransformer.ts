import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallCustomerAtSummaryTransformer } from "./ECommerceMallCustomerAtSummaryTransformer";
import { ECommerceMallProductAtSummaryTransformer } from "./ECommerceMallProductAtSummaryTransformer";

export namespace ECommerceMallWishlistItemAtSummaryTransformer {
  export type Payload = Prisma.e_commerce_mall_wishlist_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: ECommerceMallCustomerAtSummaryTransformer.select(),
        product: ECommerceMallProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_wishlist_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallWishlistItem.ISummary> {
    return {
      id: input.id,
      customer: await ECommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      product: await ECommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies IECommerceMallWishlistItem.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallWishlistItemAtSummaryTransformer {
//       export type Payload = Prisma.e_commerce_mall_wishlist_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer: ECommerceMallCustomerAtSummaryTransformer.select(),
//             product: ECommerceMallProductAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.e_commerce_mall_wishlist_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallWishlistItem.ISummary> {
//         return {
//   id: {string},
//   customer: await ECommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   product: await ECommerceMallProductAtSummaryTransformer.transform(input.product),
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------