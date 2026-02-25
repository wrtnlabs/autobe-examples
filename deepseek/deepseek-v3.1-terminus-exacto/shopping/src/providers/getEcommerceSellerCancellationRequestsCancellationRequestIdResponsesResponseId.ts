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

export async function getEcommerceSellerCancellationRequestsCancellationRequestIdResponsesResponseId(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCancellationResponseRecord> {
  // First verify the cancellation request exists and belongs to this seller
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUnique({
      where: {
        id: props.cancellationRequestId,
        ecommerce_seller_id: props.seller.id,
      },
    });
  if (!cancellationRequest) {
    throw new HttpException(
      "Cancellation request not found or access denied",
      404,
    );
  }
  // Retrieve the specific response record
  const responseRecord =
    await MyGlobal.prisma.ecommerce_cancellation_response_records.findUnique({
      where: {
        id: props.responseId,
        ecommerce_cancellation_request_id: props.cancellationRequestId,
        seller: { id: props.seller.id },
      },
      ...EcommerceCancellationResponseRecordTransformer.select(),
    });
  if (!responseRecord) {
    throw new HttpException(
      "Cancellation response record not found or access denied",
      404,
    );
  }
  return await EcommerceCancellationResponseRecordTransformer.transform(
    responseRecord,
  );
}
