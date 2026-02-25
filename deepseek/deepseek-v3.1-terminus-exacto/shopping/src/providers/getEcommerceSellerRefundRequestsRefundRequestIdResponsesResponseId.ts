import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceRefundResponseRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundResponseRecord";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceRefundResponseRecordTransformer } from "../transformers/EcommerceRefundResponseRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerRefundRequestsRefundRequestIdResponsesResponseId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
}): Promise<IEcommerceRefundResponseRecord> {
  // First, verify the refund request exists and belongs to this seller
  const refundRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findUnique({
      where: {
        id: props.refundRequestId,
        ecommerce_seller_id: props.seller.id, // Ensure the refund request belongs to this seller
      },
      select: { id: true },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found or access denied", 404);
  }
  // Then retrieve the specific response with authorization check
  const response =
    await MyGlobal.prisma.ecommerce_refund_response_records.findUniqueOrThrow({
      where: {
        id: props.responseId,
        ecommerce_refund_request_id: props.refundRequestId,
        ecommerce_seller_id: props.seller.id,
      },
      ...EcommerceRefundResponseRecordTransformer.select(),
    });
  return await EcommerceRefundResponseRecordTransformer.transform(response);
}
