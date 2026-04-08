import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerSellerRefundRequestsRequestId(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequest.IUpdate;
}): Promise<IEcommerceMallRefundRequest> {
  const { seller, requestId, body } = props;
  // Verify refund request exists and is pending
  const record =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirstOrThrow({
      where: {
        id: requestId,
      },
      include: {
        item: {
          select: {
            id: true,
            seller_id: true,
            status: true,
            quantity: true,
            productVariant: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  // Verify status is pending
  if (record.status !== "pending") {
    throw new HttpException("Refund request already resolved", 409);
  }
  // Verify seller owns the order item
  if (record.item.seller_id !== seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify item status is delivered
  if (record.item.status !== "delivered") {
    throw new HttpException("Only delivered items can be refunded", 400);
  }
  // Check 7-day refund window using date comparison
  const deliveredDate = toISOStringSafe(record.updated_at);
  const sevenDaysAgo = toISOStringSafe(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  );
  if (deliveredDate < sevenDaysAgo) {
    throw new HttpException("Refund window expired", 409);
  }
  // Execute transaction
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const now = toISOStringSafe(new Date());
    const updatedRecord = await tx.ecommerce_mall_refund_requests.update({
      where: { id: requestId },
      data: {
        status: body.status,
        updated_at: now,
        ...(body.status === "approved"
          ? { approved_by_seller_id: seller.id }
          : body.status === "rejected"
            ? { rejected_by_seller_id: seller.id }
            : {}),
      },
    });
    await tx.ecommerce_mall_refund_request_snapshots.create({
      data: {
        id: v4(),
        refund_request_id: requestId,
        order_item_id: record.item.id,
        status: body.status,
        reason: record.reason,
        created_at: record.created_at,
        responded_at: now,
        approved_by_seller_id: body.status === "approved" ? seller.id : null,
        rejection_reason: null,
        deleted_at: record.deleted_at,
        snapshot_at: now,
      },
    });
    if (body.status === "approved") {
      await tx.ecommerce_mall_order_items.update({
        where: { id: record.item.id },
        data: {
          status: "refunded",
          updated_at: now,
        },
      });
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: v4(),
          ecommerce_mall_product_variant_id: record.item.productVariant.id,
          quantity_change: record.item.quantity,
          operation_type: "REFUND_RETURN",
          reference_id: record.item.id,
          notes: "Stock restored due to refund approval",
          created_at: now,
          updated_at: now,
        },
      });
    }
    return tx.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: requestId },
      ...EcommerceMallRefundRequestTransformer.select(),
    });
  });
  return await EcommerceMallRefundRequestTransformer.transform(updated);
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
// import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerSellerRefundRequestsRequestId(props: {
//   seller: SellerPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IEcommerceMallRefundRequest.IUpdate;
// }): Promise<IEcommerceMallRefundRequest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirstOrThrow({
//     ...EcommerceMallRefundRequestTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallRefundRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------