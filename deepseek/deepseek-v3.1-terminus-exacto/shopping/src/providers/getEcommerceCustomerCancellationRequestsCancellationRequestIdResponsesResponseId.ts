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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCancellationResponseRecordTransformer } from "../transformers/EcommerceCancellationResponseRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerCancellationRequestsCancellationRequestIdResponsesResponseId(props: {
  customer: CustomerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCancellationResponseRecord> {
  const response =
    await MyGlobal.prisma.ecommerce_cancellation_response_records.findUnique({
      where: {
        id: props.responseId,
        cancellationRequest: {
          id: props.cancellationRequestId,
          ecommerce_customer_id: props.customer.id,
        },
      },
      ...EcommerceCancellationResponseRecordTransformer.select(),
    });
  if (!response) {
    throw new HttpException(
      "Cancellation response not found or access denied",
      404,
    );
  }
  return await EcommerceCancellationResponseRecordTransformer.transform(
    response,
  );
}
