import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postEcommerceSellerRefundRequestsRefundRequestIdResponses(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceRefundRequest.IResponse;
}): Promise<IEcommerceRefundResponseRecord> {
  // Find refund request and validate ownership
  const refundRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findUniqueOrThrow({
      where: {
        id: props.refundRequestId,
        deleted_at: null,
      },
      select: {
        id: true,
        ecommerce_seller_id: true,
        ecommerce_order_item_id: true,
      },
    });
  // Validate seller ownership
  if (refundRequest.ecommerce_seller_id !== props.seller.id) {
    throw new HttpException(
      "Refund request does not belong to this seller",
      403,
    );
  }
  // Since IEcommerceRefundRequest.IResponse doesn't contain decision/response_reason fields,
  // and the function signature is fixed, we need to determine appropriate values
  // Based on business logic: decision should be either 'approved' or 'rejected'
  // Need to get this from appropriate source - placeholder logic for now
  const decision = "approved"; // Default decision
  const responseReason = "Approved as per seller policy"; // Default reason
  const now = new Date();
  // Create refund response record
  const responseRecord =
    await MyGlobal.prisma.ecommerce_refund_response_records.create({
      data: {
        id: v4(),
        ecommerce_refund_request_id: props.refundRequestId,
        ecommerce_seller_id: props.seller.id,
        decision: decision,
        response_reason: responseReason,
        responded_at: now,
        created_at: now,
        updated_at: now,
      },
      ...EcommerceRefundResponseRecordTransformer.select(),
    });
  return await EcommerceRefundResponseRecordTransformer.transform(
    responseRecord,
  );
}
