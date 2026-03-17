import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
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

export async function postEcommerceMallSellerRefundRequestsRefundRequestIdReject(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequest.IReject;
}): Promise<IEcommerceMallRefundRequest> {
  const now = toISOStringSafe(new Date());
  const existing =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        status: true,
        seller_response: true,
        rejection_reason: true,
        decision_at: true,
        ecommerce_mall_order_item_id: true,
      },
    });
  if (existing.status !== "pending") {
    throw new HttpException("Refund request is not pending", 409);
  }
  if (existing.seller_response !== null) {
    throw new HttpException("Refund request already responded", 409);
  }
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: existing.ecommerce_mall_order_item_id },
      select: { ecommerce_mall_order_id: true },
    });
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: orderItem.ecommerce_mall_order_id },
    select: { customer_id: true },
  });
  const rejectionReasonValue:
    | (string & tags.MinLength<10> & tags.MaxLength<500>)
    | null
    | undefined = props.body.rejection_reason;
  if (
    rejectionReasonValue === null ||
    rejectionReasonValue === undefined ||
    (typeof rejectionReasonValue === "string" &&
      rejectionReasonValue.trim().length < 10)
  ) {
    throw new HttpException(
      "Rejection reason must be at least 10 characters",
      400,
    );
  }
  if (
    typeof rejectionReasonValue === "string" &&
    rejectionReasonValue.length > 500
  ) {
    throw new HttpException(
      "Rejection reason must be at most 500 characters",
      400,
    );
  }
  const rejectionReason:
    | (string & tags.MinLength<10> & tags.MaxLength<500>)
    | null = rejectionReasonValue;
  const result = await MyGlobal.prisma.ecommerce_mall_refund_requests.update({
    where: { id: props.refundRequestId },
    data: {
      status: "rejected" as const,
      seller_response: rejectionReason,
      rejection_reason: rejectionReason,
      decision_at: new Date(now),
      updated_at: new Date(now),
    },
  });
  const snapshot: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.create({
    data: {
      id: snapshot,
      refund_request_id: props.refundRequestId,
      actor_type: "seller" as const,
      action_type: "rejected" as const,
      status_before: "pending" as const,
      status_after: "rejected" as const,
      response_before: null as string | null,
      response_after: rejectionReason,
      created_at: new Date(now),
    },
  });
  const snapshotOfSeller: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.ecommerce_mall_refund_request_snapshot_of_sellers.create(
    {
      data: {
        id: snapshotOfSeller,
        refund_request_snapshot_id: snapshot,
        seller_id: props.seller.id,
        seller_session_id: props.seller.session_id,
        created_at: new Date(now),
        updated_at: new Date(now),
      },
    },
  );
  const updated =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      ...EcommerceMallRefundRequestTransformer.select(),
    });
  return await EcommerceMallRefundRequestTransformer.transform(updated);
}
