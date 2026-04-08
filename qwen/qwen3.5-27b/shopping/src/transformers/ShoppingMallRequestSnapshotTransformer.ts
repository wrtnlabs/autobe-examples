import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRequestSnapshot";
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

export namespace ShoppingMallRequestSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_request_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        request_type: true,
        status_before: true,
        status_after: true,
        seller_reason: true,
        created_at: true,
        cancellationRequest: {
          select: { id: true },
        },
        refundRequest: {
          select: { id: true },
        },
        orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallRequestSnapshot> {
    return {
      id: input.id,
      requestType: input.request_type,
      statusBefore: input.status_before,
      statusAfter: input.status_after,
      sellerReason: input.seller_reason ?? null,
      createdAt: input.created_at.toISOString(),
      cancellationRequestId: input.cancellationRequest?.id ?? null,
      refundRequestId: input.refundRequest?.id ?? null,
      orderItemId: input.orderItem.id,
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallRequestSnapshotTransformer {
//       export type Payload = Prisma.shopping_mall_request_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             request_type: true,
//             status_before: true,
//             status_after: true,
//             seller_reason: true,
//             created_at: true,
//             shopping_mall_cancellation_request_id: true,
//             shopping_mall_refund_request_id: true,
//             orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
//             customer: ShoppingMallCustomerAtSummaryTransformer.select(),
//             seller: ShoppingMallSellerAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_request_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallRequestSnapshot> {
//         return {
//   id: {string},
//   requestType: {string},
//   statusBefore: {string},
//   statusAfter: {string},
//   sellerReason: {string | null},
//   createdAt: {string},
//   cancellationRequestId: {string | null},
//   refundRequestId: {string | null},
//   orderItemId: {string},
//   customer: await ShoppingMallCustomerAtSummaryTransformer.transform(input.customer),
//   seller: await ShoppingMallSellerAtSummaryTransformer.transform(input.seller),
//   orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//         };
//       }
//     }
//--------------------------------------------------------------