import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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

export async function putEcommerceMallSellerCancellationRequestsCancellationRequestId(props: {
  seller: SellerPayload;
  cancellationRequestId: string;
  body: IEcommerceMallCancellationRequest.IUpdate;
}): Promise<IEcommerceMallCancellationRequest> {
  const now = new Date().toISOString();
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          id: true,
          status: true,
          reason: true,
          response_reason: true,
          order_item_id: true,
          seller_id: true,
          orderItem: {
            select: {
              id: true,
              quantity: true,
              variant_id: true,
              status: true,
            },
          },
        },
      },
    );
  if (cancellationRequest.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      `Cancellation request already processed with status: ${cancellationRequest.status}`,
      409,
    );
  }
  if (props.body.status !== "approved" && props.body.status !== "rejected") {
    throw new HttpException(
      "Invalid status value. Must be 'approved' or 'rejected'",
      400,
    );
  }
  const snapshotId = v4();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.ecommerce_mall_cancellation_request_snapshots.create({
      data: {
        id: snapshotId,
        cancellation_request_id: cancellationRequest.id,
        status_before: cancellationRequest.status,
        status_after: props.body.status,
        reason_before: cancellationRequest.reason,
        reason_after: cancellationRequest.reason,
        reviewer_note: props.body.responseReason ?? null,
        created_at: now,
      } satisfies Prisma.ecommerce_mall_cancellation_request_snapshotsCreateInput,
    });
    if (props.body.status === "approved") {
      const orderItem = cancellationRequest.orderItem;
      if (orderItem) {
        const inventoryId = v4();
        await tx.ecommerce_mall_inventory_records.create({
          data: {
            id: inventoryId,
            variant_id: orderItem.variant_id,
            quantity_change: orderItem.quantity,
            reason: "cancellation_return",
            created_at: now,
          } satisfies Prisma.ecommerce_mall_inventory_recordsCreateInput,
        });
        await tx.ecommerce_mall_order_items.update({
          where: { id: orderItem.id },
          data: {
            status: "cancelled",
            updated_at: now,
          } satisfies Prisma.ecommerce_mall_order_itemsUpdateInput,
        });
      }
    }
    await tx.ecommerce_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: props.body.status,
        response_reason: props.body.responseReason ?? null,
        responded_at: now,
        updated_at: now,
      } satisfies Prisma.ecommerce_mall_cancellation_requestsUpdateInput,
    });
  });
  const updated =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        ...EcommerceMallCancellationRequestTransformer.select(),
      },
    );
  return await EcommerceMallCancellationRequestTransformer.transform(updated);
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
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSellerCancellationRequestsCancellationRequestId(props: {
//   seller: SellerPayload;
//   cancellationRequestId: string;
//   body: IEcommerceMallCancellationRequest.IUpdate;
// }): Promise<IEcommerceMallCancellationRequest> {
//   await MyGlobal.prisma.ecommerce_mall_cancellation_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallCancellationRequestTransformer.select(),
//   });
//   return await EcommerceMallCancellationRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------