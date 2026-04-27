import { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallCancellationRequestTransformer } from "./ECommerceMallCancellationRequestTransformer";
import { ECommerceMallOrderAtSummaryTransformer } from "./ECommerceMallOrderAtSummaryTransformer";
import { ECommerceMallOrderItemSellerSnapshotTransformer } from "./ECommerceMallOrderItemSellerSnapshotTransformer";
import { ECommerceMallOrderItemSnapshotTransformer } from "./ECommerceMallOrderItemSnapshotTransformer";
import { ECommerceMallOrderItemStatusLogTransformer } from "./ECommerceMallOrderItemStatusLogTransformer";
import { ECommerceMallProductVariantAtSummaryTransformer } from "./ECommerceMallProductVariantAtSummaryTransformer";
import { ECommerceMallRefundRequestTransformer } from "./ECommerceMallRefundRequestTransformer";
import { ECommerceMallReviewTransformer } from "./ECommerceMallReviewTransformer";
import { ECommerceMallShipmentAtSummaryTransformer } from "./ECommerceMallShipmentAtSummaryTransformer";

export namespace ECommerceMallOrderItemTransformer {
  export type Payload = Prisma.e_commerce_mall_order_itemsGetPayload<
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
        deleted_at: true,
        order: ECommerceMallOrderAtSummaryTransformer.select(),
        productVariant:
          ECommerceMallProductVariantAtSummaryTransformer.select(),
        productVariantSnapshot:
          ECommerceMallOrderItemSnapshotTransformer.select(),
        sellerSnapshot:
          ECommerceMallOrderItemSellerSnapshotTransformer.select(),
        statusLogs: ECommerceMallOrderItemStatusLogTransformer.select(),
        shipmentItem: {
          select: {
            shipment: ECommerceMallShipmentAtSummaryTransformer.select(),
          },
        } satisfies Prisma.e_commerce_mall_shipment_itemsFindManyArgs,
        cancellationRequests:
          ECommerceMallCancellationRequestTransformer.select(),
        refundRequest: ECommerceMallRefundRequestTransformer.select(),
        review: ECommerceMallReviewTransformer.select(),
      },
    } satisfies Prisma.e_commerce_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallOrderItem> {
    return {
      id: input.id,
      quantity: input.quantity,
      unit_price: input.unit_price,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? undefined,
      order: await ECommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
      productVariant:
        await ECommerceMallProductVariantAtSummaryTransformer.transform(
          input.productVariant,
        ),
      productVariantSnapshot:
        input.productVariantSnapshot !== null
          ? await ECommerceMallOrderItemSnapshotTransformer.transform(
              input.productVariantSnapshot,
            )
          : (() => {
              throw new HttpException(
                "Product variant snapshot not found",
                404,
              );
            })(),
      sellerSnapshot:
        input.sellerSnapshot !== null
          ? await ECommerceMallOrderItemSellerSnapshotTransformer.transform(
              input.sellerSnapshot,
            )
          : (() => {
              throw new HttpException("Seller snapshot not found", 404);
            })(),
      statusLogs: await ArrayUtil.asyncMap(
        input.statusLogs,
        ECommerceMallOrderItemStatusLogTransformer.transform,
      ),
      shipment: input.shipmentItem?.shipment
        ? await ECommerceMallShipmentAtSummaryTransformer.transform(
            input.shipmentItem.shipment,
          )
        : undefined,
      cancellationRequest: input.cancellationRequests[0]
        ? await ECommerceMallCancellationRequestTransformer.transform(
            input.cancellationRequests[0],
          )
        : undefined,
      refundRequest: input.refundRequest
        ? await ECommerceMallRefundRequestTransformer.transform(
            input.refundRequest,
          )
        : undefined,
      review: input.review
        ? await ECommerceMallReviewTransformer.transform(input.review)
        : undefined,
    } satisfies IECommerceMallOrderItem;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallOrderItemTransformer {
//       export type Payload = Prisma.e_commerce_mall_order_itemsGetPayload<ReturnType<typeof select>>;
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
//             deleted_at: true,
//             order: ECommerceMallOrderAtSummaryTransformer.select(),
//             productVariant: ECommerceMallProductVariantAtSummaryTransformer.select(),
//             statusLogs: ECommerceMallOrderItemStatusLogTransformer.select(),
//             sellerSnapshot: ECommerceMallOrderItemSellerSnapshotTransformer.select(),
//             productVariantSnapshot: ECommerceMallOrderItemSnapshotTransformer.select(),
//             review: ECommerceMallReviewTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.e_commerce_mall_order_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallOrderItem> {
//         return {
//   id: {string},
//   quantity: {integer},
//   unit_price: {number},
//   status: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   order: await ECommerceMallOrderAtSummaryTransformer.transform(input.order),
//   productVariant: await ECommerceMallProductVariantAtSummaryTransformer.transform(input.productVariant),
//   productVariantSnapshot: await ECommerceMallOrderItemSnapshotTransformer.transform(input.productVariantSnapshot),
//   sellerSnapshot: await ECommerceMallOrderItemSellerSnapshotTransformer.transform(input.sellerSnapshot),
//   statusLogs: await ArrayUtil.asyncMap(input.statusLogs, ECommerceMallOrderItemStatusLogTransformer.transform),
//   shipment: {IECommerceMallShipment.ISummary | null},
//   cancellationRequest: {IECommerceMallCancellationRequest | null},
//   refundRequest: {IECommerceMallRefundRequest | null},
//   review: input.review ? await ECommerceMallReviewTransformer.transform(input.review) : null,
//         };
//       }
//     }
//--------------------------------------------------------------