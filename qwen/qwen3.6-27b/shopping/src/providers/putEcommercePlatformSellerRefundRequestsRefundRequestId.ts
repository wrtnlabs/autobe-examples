import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformRefundRequestTransformer } from "../transformers/EcommercePlatformRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommercePlatformSellerRefundRequestsRefundRequestId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommercePlatformRefundRequest.IUpdate;
}): Promise<IEcommercePlatformRefundRequest> {
  const requestedStatus = props.body.status;
  if (
    !requestedStatus ||
    (requestedStatus !== "approved" && requestedStatus !== "rejected")
  ) {
    throw new HttpException("Status must be 'approved' or 'rejected'", 400);
  }
  const refundRequest =
    await MyGlobal.prisma.ecommerce_platform_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        status: true,
        seller_profile_id: true,
        order_item_id: true,
        refund_reason: true,
      },
    });
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request must be pending", 409);
  }
  if (refundRequest.seller_profile_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const orderItem =
    await MyGlobal.prisma.ecommerce_platform_order_items.findUniqueOrThrow({
      where: { id: refundRequest.order_item_id },
      select: {
        id: true,
        status: true,
        quantity: true,
        ecommerce_platform_product_variant_id: true,
        ecommerce_platform_order_id: true,
      },
    });
  if (orderItem.status !== "delivered") {
    throw new HttpException("Order item must be delivered", 409);
  }
  const computeOrderStatus = (statuses: readonly string[]): string => {
    const uniqueStatuses = new Set(statuses);
    if (uniqueStatuses.size === 1) {
      const single = statuses[0]!;
      if (
        single === "refunded" ||
        single === "cancelled" ||
        single === "delivered" ||
        single === "paid" ||
        single === "shipped"
      ) {
        return single;
      }
    }
    return "partially_completed";
  };
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (requestedStatus === "approved") {
      await tx.ecommerce_platform_order_items.update({
        where: { id: orderItem.id },
        data: {
          status: "refunded",
          updated_at: new Date(),
        },
      });
      await tx.ecommerce_platform_inventory_records.create({
        data: {
          id: v4(),
          productVariant: {
            connect: { id: orderItem.ecommerce_platform_product_variant_id },
          },
          quantity_delta: orderItem.quantity,
          reason: `Refund ${refundRequest.id} stock restoration`,
          created_at: new Date(),
        },
      });
      const orderItems = await tx.ecommerce_platform_order_items.findMany({
        where: {
          ecommerce_platform_order_id: orderItem.ecommerce_platform_order_id,
        },
        select: { status: true },
      });
      await tx.ecommerce_platform_orders.update({
        where: { id: orderItem.ecommerce_platform_order_id },
        data: {
          status: computeOrderStatus(orderItems.map((item) => item.status)),
          updated_at: new Date(),
        },
      });
    }
    await tx.ecommerce_platform_refund_requests.update({
      where: { id: refundRequest.id },
      data: {
        status: requestedStatus,
        responded_at: new Date(),
        updated_at: new Date(),
        ...(props.body.refund_reason !== undefined && {
          refund_reason: props.body.refund_reason,
        }),
      },
    });
    const snapshotId = v4();
    await tx.ecommerce_platform_snapshots.create({
      data: {
        id: snapshotId,
        entity_type: "refund_request",
        created_at: new Date(),
      },
    });
    await tx.ecommerce_platform_snapshot_refund_requests.create({
      data: {
        id: v4(),
        snapshot: { connect: { id: snapshotId } },
        refundRequest: { connect: { id: refundRequest.id } },
        previous_reason: refundRequest.refund_reason,
        current_reason: props.body.refund_reason ?? refundRequest.refund_reason,
        previous_approval_status: refundRequest.status,
        current_approval_status: requestedStatus,
        created_at: new Date(),
      },
    });
  });
  const updated =
    await MyGlobal.prisma.ecommerce_platform_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      ...EcommercePlatformRefundRequestTransformer.select(),
    });
  return await EcommercePlatformRefundRequestTransformer.transform(updated);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
// import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
// import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
// import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommercePlatformSellerRefundRequestsRefundRequestId(props: {
//   seller: SellerPayload;
//   refundRequestId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformRefundRequest.IUpdate;
// }): Promise<IEcommercePlatformRefundRequest> {
//   await MyGlobal.prisma.ecommerce_platform_refund_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_platform_refund_requests.findUniqueOrThrow({
//     where: { ... },
//     ...EcommercePlatformRefundRequestTransformer.select(),
//   });
//   return await EcommercePlatformRefundRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------