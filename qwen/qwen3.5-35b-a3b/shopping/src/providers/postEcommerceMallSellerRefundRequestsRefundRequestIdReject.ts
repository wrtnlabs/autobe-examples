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
import { EcommerceMallCustomerAtSummaryTransformer } from "../transformers/EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerRefundRequestsRefundRequestIdReject(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequest.IReject;
}): Promise<IEcommerceMallRefundRequest> {
  const rejectionReason = props.body.rejection_reason;
  if (
    rejectionReason === null ||
    rejectionReason === undefined ||
    rejectionReason.length < 10 ||
    rejectionReason.length > 500
  ) {
    throw new HttpException(
      "Rejection reason must be provided and between 10-500 characters",
      400,
    );
  }
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        status: true,
        seller_response: true,
        orderItem: {
          select: {
            seller_snapshot_id: true,
            sellerSnapshot: {
              select: {
                actor_id: true,
              },
            },
          },
        },
      },
    });
  if (refundRequest.status !== "pending") {
    throw new HttpException(
      "Refund request is not in pending status - cannot reject",
      409,
    );
  }
  const orderItemSellerId = refundRequest.orderItem.sellerSnapshot.actor_id;
  if (orderItemSellerId !== props.seller.id) {
    throw new HttpException(
      "You can only reject refund requests for products you own",
      403,
    );
  }
  const currentSellerResponse = refundRequest.seller_response;
  const [updatedRefundRequest] = await MyGlobal.prisma.$transaction(
    async (tx) => {
      const updated = await tx.ecommerce_mall_refund_requests.update({
        where: { id: props.refundRequestId },
        data: {
          status: "rejected",
          rejection_reason: rejectionReason,
          seller_response: rejectionReason,
          decision_at: new Date(),
        },
        include: {
          orderItem: {
            include: {
              productSnapshot: true,
            },
          },
        },
      });
      const snapshot = await tx.ecommerce_mall_refund_request_snapshots.create({
        data: {
          id: v4(),
          refund_request_id: props.refundRequestId,
          actor_type: "seller",
          action_type: "rejected",
          status_before: "pending",
          status_after: "rejected",
          response_before: currentSellerResponse,
          response_after: rejectionReason,
          created_at: new Date(),
        },
      });
      await tx.ecommerce_mall_refund_request_snapshot_of_sellers.create({
        data: {
          id: v4(),
          refund_request_snapshot_id: snapshot.id,
          seller_id: props.seller.id,
          seller_session_id: props.seller.session_id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      return [updated] as const;
    },
  );
  const fullRefundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        refund_code: true,
        status: true,
        reason: true,
        evidence_description: true,
        seller_response: true,
        rejection_reason: true,
        delivery_date: true,
        submitted_at: true,
        decision_at: true,
        processed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
        inventoryRecords: true,
        snapshots: true,
      },
    });
  return await EcommerceMallRefundRequestTransformer.transform(
    fullRefundRequest,
  );
}
