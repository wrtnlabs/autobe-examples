import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderAtSummaryTransformer } from "./EcommerceMallOrderAtSummaryTransformer";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallProductSnapshotAtSummaryTransformer } from "./EcommerceMallProductSnapshotAtSummaryTransformer";
import { EcommerceMallProductVariantAtSummaryTransformer } from "./EcommerceMallProductVariantAtSummaryTransformer";
import { EcommerceMallSellerProfileSnapshotAtSummaryTransformer } from "./EcommerceMallSellerProfileSnapshotAtSummaryTransformer";

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
        product: EcommerceMallProductAtSummaryTransformer.select(),
        productVariant:
          EcommerceMallProductVariantAtSummaryTransformer.select(),
        productSnapshot:
          EcommerceMallProductSnapshotAtSummaryTransformer.select(),
        sellerProfileSnapshot:
          EcommerceMallSellerProfileSnapshotAtSummaryTransformer.select(),
        shipmentItem: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_shipment_itemsFindFirstArgs,
        _count: {
          select: {
            cancellationRequests: true,
            refundRequests: true,
            reviews: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderItem> {
    return {
      id: input.id,
      createdAt: toISOStringSafe(input.created_at),
      quantity: input.quantity,
      unitPrice: input.unit_price,
      status: input.status,
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      productSnapshot:
        await EcommerceMallProductSnapshotAtSummaryTransformer.transform(
          input.productSnapshot,
        ),
      sellerProfileSnapshot:
        await EcommerceMallSellerProfileSnapshotAtSummaryTransformer.transform(
          input.sellerProfileSnapshot,
        ),
      productVariant:
        await EcommerceMallProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      shipments_count: input.shipmentItem ? 1 : 0,
      cancellationRequests_count: input._count.cancellationRequests,
      refundRequests_count: input._count.refundRequests,
      reviews_count: input._count.reviews,
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
//             product: EcommerceMallProductAtSummaryTransformer.select(),
//             productVariant: EcommerceMallProductVariantAtSummaryTransformer.select(),
//             productSnapshot: EcommerceMallProductSnapshotAtSummaryTransformer.select(),
//             sellerProfileSnapshot: EcommerceMallSellerProfileSnapshotAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallOrderItem> {
//         return {
//   id: {string},
//   createdAt: {string},
//   quantity: {integer},
//   unitPrice: {number},
//   status: {string},
//   order: await EcommerceMallOrderAtSummaryTransformer.transform(input.order),
//   productSnapshot: await EcommerceMallProductSnapshotAtSummaryTransformer.transform(input.productSnapshot),
//   sellerProfileSnapshot: await EcommerceMallSellerProfileSnapshotAtSummaryTransformer.transform(input.sellerProfileSnapshot),
//   productVariant: await EcommerceMallProductVariantAtSummaryTransformer.transform(input.productVariant),
//   product: await EcommerceMallProductAtSummaryTransformer.transform(input.product),
//   shipments_count: {integer},
//   cancellationRequests_count: {integer},
//   refundRequests_count: {integer},
//   reviews_count: {integer},
//         };
//       }
//     }
//--------------------------------------------------------------