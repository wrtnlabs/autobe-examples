import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCancellationResponseRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationResponseRecord";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceCancellationResponseRecordCollector } from "../collectors/EcommerceCancellationResponseRecordCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceCancellationResponseRecordTransformer } from "../transformers/EcommerceCancellationResponseRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postEcommerceSellerCancellationRequestsCancellationRequestIdResponses(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IEcommerceCancellationResponseRecord.ICreate;
}): Promise<IEcommerceCancellationResponseRecord> {
  // Verify cancellation request exists
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
      where: { id: props.cancellationRequestId },
      select: {
        id: true,
        ecommerce_seller_id: true,
        created_at: true,
      },
    });
  // Check authorization - seller must own the cancellation request
  if (cancellationRequest.ecommerce_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if response already exists (unique constraint)
  const existingResponse =
    await MyGlobal.prisma.ecommerce_cancellation_response_records.findUnique({
      where: { ecommerce_cancellation_request_id: props.cancellationRequestId },
    });
  if (existingResponse) {
    throw new HttpException(
      "Response already exists for this cancellation request",
      400,
    );
  }
  // Check if request is older than 7 days (automatic approval)
  const requestAge = Date.now() - cancellationRequest.created_at.getTime();
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  if (requestAge > sevenDaysInMs) {
    throw new HttpException(
      "Cancellation request has expired (older than 7 days)",
      400,
    );
  }
  // Create the response record using collector
  const responseRecord =
    await MyGlobal.prisma.ecommerce_cancellation_response_records.create({
      data: await EcommerceCancellationResponseRecordCollector.collect({
        body: props.body,
        ecommerceCancellationRequests: { id: props.cancellationRequestId },
        ecommerceSellers: { id: props.seller.id },
        ecommerceSellerSessions: { id: props.seller.session_id },
      }),
      ...EcommerceCancellationResponseRecordTransformer.select(),
    });
  // Return transformed response
  return await EcommerceCancellationResponseRecordTransformer.transform(
    responseRecord,
  );
}
