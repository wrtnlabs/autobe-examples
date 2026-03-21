import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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

export async function postEcommerceMallSellerRefundRequestsRequestIdReject(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequest.IReject;
}): Promise<IEcommerceMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
        ecommerce_mall_customer_id: true,
        reason: true,
        status: true,
        seller_response_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (refundRequest.deleted_at !== null) {
    throw new HttpException("Refund request not found", 404);
  }
  if (refundRequest.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request has already been processed", 400);
  }
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.create({
      data: {
        id: v4(),
        ecommerce_mall_refund_request_id: refundRequest.id,
        ecommerce_mall_customer_id: refundRequest.ecommerce_mall_customer_id,
        ecommerce_mall_seller_id: refundRequest.ecommerce_mall_seller_id,
        snapshot_reason: refundRequest.reason,
        snapshot_status: refundRequest.status,
        seller_response: "rejected",
        seller_response_reason: props.body.seller_response_reason,
        created_at: now,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.ecommerce_mall_refund_requests.update({
      where: { id: props.requestId },
      data: {
        status: "rejected",
        seller_response_at: now,
        updated_at: now,
      },
    }),
  ]);
  const updated =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select:
        (EcommerceMallRefundRequestTransformer.select() as any).select ??
        (EcommerceMallRefundRequestTransformer.select() as any),
    });
  return EcommerceMallRefundRequestTransformer.transform(
    updated as any,
    undefined!,
  );
}
