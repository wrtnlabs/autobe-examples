import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceRefundRequestTransformer } from "../transformers/EcommerceRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceAdminOrdersOrderIdRefundRequestsId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: IEcommerceRefundRequest.IUpdate;
}): Promise<IEcommerceRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findUnique({
      where: { id: props.id },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }
  // Ensure status is still pending before updating
  if (refundRequest.status !== "pending") {
    throw new HttpException(
      "Refund request is no longer in pending status",
      400,
    );
  }
  const updated = await MyGlobal.prisma.ecommerce_refund_requests.update({
    where: { id: props.id },
    data: {
      status: props.body.status,
      reason: props.body.reason,
      updated_at: toISOStringSafe(new Date()),
      ecommerce_order_id: props.orderId,
    },
  });
  return await EcommerceRefundRequestTransformer.transform(updated);
}
