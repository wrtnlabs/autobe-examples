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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceCancellationResponseRecordTransformer } from "../transformers/EcommerceCancellationResponseRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSellerCancellationRequestsCancellationRequestIdResponsesResponseId(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
  body: IEcommerceCancellationResponseRecord.IUpdate;
}): Promise<IEcommerceCancellationResponseRecord> {
  // 1. Verify cancellation request exists
  await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
    where: { id: props.cancellationRequestId },
  });
  // 2. Verify response record exists with proper constraints
  const existingResponse =
    await MyGlobal.prisma.ecommerce_cancellation_response_records.findUniqueOrThrow(
      {
        where: {
          id: props.responseId,
          ecommerce_cancellation_request_id: props.cancellationRequestId,
          seller: {
            id: props.seller.id,
            account_status: "active",
            deleted_at: null,
          },
        },
        select: {
          id: true,
          ecommerce_seller_id: true,
          responded_at: true,
          decision: true,
        } satisfies Prisma.ecommerce_cancellation_response_recordsFindUniqueArgs["select"],
      },
    );
  // 3. Business rule validation: check response_reason length based on analysis files
  // From analysis: cancellation reason (text, 10-500 characters)
  if (
    props.body.response_reason.length < 10 ||
    props.body.response_reason.length > 500
  ) {
    throw new HttpException(
      "Response reason must be between 10 and 500 characters",
      400,
    );
  }
  // 4. Update response reason
  await MyGlobal.prisma.ecommerce_cancellation_response_records.update({
    where: { id: props.responseId },
    data: {
      response_reason: props.body.response_reason,
    },
  });
  // 5. Fetch updated record with transformer
  const updated =
    await MyGlobal.prisma.ecommerce_cancellation_response_records.findUniqueOrThrow(
      {
        where: { id: props.responseId },
        ...EcommerceCancellationResponseRecordTransformer.select(),
      },
    );
  // 6. Transform and return
  return await EcommerceCancellationResponseRecordTransformer.transform(
    updated,
  );
}
