import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderAtSummaryTransformer } from "./EcommerceMallOrderAtSummaryTransformer";
import { EcommerceMallProductSnapshotAtSummaryTransformer } from "./EcommerceMallProductSnapshotAtSummaryTransformer";
import { EcommerceMallProductVariantAtSummaryTransformer } from "./EcommerceMallProductVariantAtSummaryTransformer";
import { EcommerceMallSellerProfileSnapshotTransformer } from "./EcommerceMallSellerProfileSnapshotTransformer";

export namespace EcommerceMallOrderItemTransformer {
  export type Payload = Prisma.ecommerce_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        unit_price: true,
        status: true,
        created_at: true,
        updated_at: true,
        order: EcommerceMallOrderAtSummaryTransformer.select(),
        product: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
        productVariant:
          EcommerceMallProductVariantAtSummaryTransformer.select(),
        productSnapshot:
          EcommerceMallProductSnapshotAtSummaryTransformer.select(),
        sellerProfileSnapshot:
          EcommerceMallSellerProfileSnapshotTransformer.select(),
        shipmentItem: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_shipment_itemsFindManyArgs,
        cancellationRequests: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs,
        refundRequests: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs,
        reviews: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItem> {
    return {
      id: input.id,
      quantity: input.quantity,
      unitPrice: Number(input.unit_price),
      status: input.status,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      productVariant:
        await EcommerceMallProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      productSnapshot:
        await EcommerceMallProductSnapshotAtSummaryTransformer.transform(
          input.productSnapshot,
        ),
      sellerProfileSnapshot:
        await EcommerceMallSellerProfileSnapshotTransformer.transform(
          input.sellerProfileSnapshot,
        ),
      cancellationRequestsCount: input.cancellationRequests.length || undefined,
      refundRequestsCount: input.refundRequests.length || undefined,
      reviewsCount: input.reviews.length || undefined,
    } satisfies IEcommerceMallOrderItem;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallOrderItemTransformer {
//       export type Payload = Prisma.ecommerce_mall_order_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             unit_price: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             order: EcommerceMallOrderAtSummaryTransformer.select(),
//             ecommerce_mall_product_id: true,
//             productVariant: EcommerceMallProductVariantAtSummaryTransformer.select(),
//             productSnapshot: EcommerceMallProductSnapshotAtSummaryTransformer.select(),
//             sellerProfileSnapshot: EcommerceMallSellerProfileSnapshotTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrderItem> {
//         return {
//   cancellationRequestsCount: {integer},
//   createdAt: {string},
//   id: {string},
//   order: await EcommerceMallOrderAtSummaryTransformer.transform(input.order),
//   productSnapshot: await EcommerceMallProductSnapshotAtSummaryTransformer.transform(input.productSnapshot),
//   productVariant: await EcommerceMallProductVariantAtSummaryTransformer.transform(input.productVariant),
//   quantity: {integer},
//   refundRequestsCount: {integer},
//   reviewsCount: {integer},
//   sellerProfileSnapshot: await EcommerceMallSellerProfileSnapshotTransformer.transform(input.sellerProfileSnapshot),
//   status: {string},
//   unitPrice: {number},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------