import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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
import { EcommerceMallCancellationRequestTransformer } from "../transformers/EcommerceMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerSellerCancelRequestsRequestId(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequest.IUpdate;
}): Promise<IEcommerceMallCancellationRequest> {
  const request =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirstOrThrow(
      {
        select: {
          id: true,
          reason: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          ecommerce_mall_order_id: true,
          ecommerce_mall_order_item_id: true,
          ecommerce_mall_seller_id: true,
          item: {
            select: {
              id: true,
              quantity: true,
              unit_price: true,
              subtotal: true,
              status: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              order: { select: { id: true, order_number: true } },
              productVariant: {
                select: { id: true, sku_code: true, price: true },
              },
              seller: { select: { id: true, display_name: true } },
            },
          },
          order: { select: { id: true, order_number: true } },
          seller: {
            select: {
              id: true,
              display_name: true,
              approval_status: true,
              is_suspended: true,
              created_at: true,
            },
          },
        },
        where: { id: props.requestId },
      },
    );
  if (request.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (request.status !== "pending") {
    throw new HttpException("Cannot modify non-pending request", 409);
  }
  if (props.body.status !== "approved" && props.body.status !== "rejected") {
    throw new HttpException("Invalid status", 400);
  }
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    const snapshotId = v4();
    await tx.ecommerce_mall_cancellation_requests.update({
      where: { id: props.requestId },
      data: {
        status: props.body.status,
        updated_at: now,
        ...(props.body.status === "rejected" &&
        props.body.seller_rejection_reason !== undefined
          ? { seller_rejection_reason: props.body.seller_rejection_reason }
          : {}),
      },
    });
    await tx.ecommerce_mall_cancellation_request_snapshots.create({
      data: {
        id: snapshotId,
        cancellationRequest: { connect: { id: props.requestId } },
        title: "Cancellation Request",
        body: request.reason,
        actor_type: "customer",
        created_at: now,
        deleted_at: null,
        approved_at: props.body.status === "approved" ? now : null,
        rejected_at: props.body.status === "rejected" ? now : null,
        seller_rejection_reason: props.body.seller_rejection_reason ?? null,
        created_by: props.seller.id,
      },
    });
    if (props.body.status === "approved") {
      await tx.ecommerce_mall_order_items.update({
        where: { id: request.item.id },
        data: { status: "cancelled" },
      });
      const inventoryRecord =
        await tx.ecommerce_mall_inventory_records.findFirst({
          where: {
            ecommerce_mall_product_variant_id: request.item.productVariant.id,
          },
        });
      if (inventoryRecord !== null) {
        const newInventoryId = v4();
        await tx.ecommerce_mall_inventory_records.create({
          data: {
            id: newInventoryId,
            ecommerce_mall_product_variant_id: request.item.productVariant.id,
            quantity_change: request.item.quantity,
            operation_type: "CANCELLATION_RETURN" as const,
            reference_id: request.item.id,
            notes: null,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
        });
      }
      const remainingOrderItems = await tx.ecommerce_mall_order_items.findMany({
        where: {
          ecommerce_mall_order_id: request.item.order.id,
          status: { not: "cancelled" },
        },
      });
      if (remainingOrderItems.length === 0) {
        await tx.ecommerce_mall_orders.update({
          where: { id: request.item.order.id },
          data: { status: "cancelled", updated_at: now },
        });
      }
    }
  });
  const finalRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirstOrThrow(
      {
        ...EcommerceMallCancellationRequestTransformer.select(),
        where: { id: props.requestId },
      },
    );
  return await EcommerceMallCancellationRequestTransformer.transform(
    finalRequest,
  );
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
// import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerSellerCancelRequestsRequestId(props: {
//   seller: SellerPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IEcommerceMallCancellationRequest.IUpdate;
// }): Promise<IEcommerceMallCancellationRequest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirstOrThrow({
//     ...EcommerceMallCancellationRequestTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCancellationRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------