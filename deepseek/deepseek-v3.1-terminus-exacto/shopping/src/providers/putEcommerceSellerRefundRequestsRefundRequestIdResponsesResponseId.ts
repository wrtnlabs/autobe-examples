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

export async function putEcommerceSellerRefundRequestsRefundRequestIdResponsesResponseId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
  body: IEcommerceRefundResponseRecord.IUpdate;
}): Promise<IEcommerceRefundResponseRecord> {
  // First verify the response record exists and belongs to the seller
  const existingResponse =
    await MyGlobal.prisma.ecommerce_refund_response_records.findFirstOrThrow({
      where: {
        id: props.responseId,
        ecommerce_seller_id: props.seller.id,
        ecommerce_refund_request_id: props.refundRequestId,
      },
    });
  // Update the response record with new reason and timestamp
  const now = new Date();
  const updatedResponse =
    await MyGlobal.prisma.ecommerce_refund_response_records.update({
      where: { id: props.responseId },
      data: {
        response_reason: props.body.response_reason,
        responded_at: now,
        updated_at: now,
      },
      ...EcommerceRefundResponseRecordTransformer.select(),
    });
  return await EcommerceRefundResponseRecordTransformer.transform(
    updatedResponse,
  );
}
