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

export namespace ShoppingMallRequestSnapshotAtSummaryTransformer {
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
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallRequestSnapshot.ISummary> {
    return {
      id: input.id,
      request_type: input.request_type,
      status_before: input.status_before,
      status_after: input.status_after,
      seller_reason: input.seller_reason,
      created_at: input.created_at.toISOString(),
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
//     export namespace ShoppingMallRequestSnapshotAtSummaryTransformer {
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
//       export async function transform(input: Payload): Promise<IShoppingMallRequestSnapshot.ISummary> {
//         return {
//   id: {string},
//   request_type: {string},
//   status_before: {string},
//   status_after: {string},
//   seller_reason: {string | null},
//   created_at: {string},
//   customer: await ShoppingMallCustomerAtSummaryTransformer.transform(input.customer),
//   seller: await ShoppingMallSellerAtSummaryTransformer.transform(input.seller),
//   orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(input.orderItem),
//         };
//       }
//     }
//--------------------------------------------------------------