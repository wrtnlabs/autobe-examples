import { IEcommerceRefundRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceRefundRequestStatusTransformer } from "../transformers/EcommerceRefundRequestStatusTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerRefundRequestsRefundRequestIdStatusesStatusId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  statusId: string & tags.Format<"uuid">;
}): Promise<IEcommerceRefundRequestStatus> {
  // Validate that the refund request exists and belongs to this seller
  const refundRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findFirst({
      where: {
        id: props.refundRequestId,
        seller: { id: props.seller.id },
      },
      select: { id: true },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found or access denied", 404);
  }
  // Retrieve the specific status entry
  const status =
    await MyGlobal.prisma.ecommerce_refund_request_statuses.findUniqueOrThrow({
      where: {
        id: props.statusId,
        ecommerce_refund_request_id: props.refundRequestId,
      },
      ...EcommerceRefundRequestStatusTransformer.select(),
    });
  return await EcommerceRefundRequestStatusTransformer.transform(status);
}
