import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";
import { ShoppingMallOrderItemAtSummaryTransformer } from "./ShoppingMallOrderItemAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallRefundRequestAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_refund_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        responded_at: true,
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_refund_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallRefundRequest.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      created_at: input.created_at.toISOString(),
      responded_at: input.responded_at?.toISOString() ?? null,
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      seller: input.seller
        ? await ShoppingMallSellerAtSummaryTransformer.transform(input.seller)
        : null,
      orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallRefundRequestAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_refund_requestsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reason: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             responded_at: true,
//             orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
//             customer: ShoppingMallCustomerAtSummaryTransformer.select(),
//             shopping_mall_customer_session_id: true,
//             seller: ShoppingMallSellerAtSummaryTransformer.select(),
//             shopping_mall_seller_session_id: true,
//           },
//         } satisfies Prisma.shopping_mall_refund_requestsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallRefundRequest.ISummary> {
//         return {
//   id: {string},
//   reason: {string},
//   status: {string},
//   created_at: {string},
//   responded_at: {string | null},
//   customer: await ShoppingMallCustomerAtSummaryTransformer.transform(input.customer),
//   seller: input.seller ? await ShoppingMallSellerAtSummaryTransformer.transform(input.seller) : null,
//   orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//         };
//       }
//     }
//--------------------------------------------------------------