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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceRefundResponseRecordTransformer } from "../transformers/EcommerceRefundResponseRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerRefundRequestsRefundRequestIdResponsesResponseId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
}): Promise<IEcommerceRefundResponseRecord> {
  const response =
    await MyGlobal.prisma.ecommerce_refund_response_records.findFirst({
      where: {
        id: props.responseId,
        refundRequest: {
          id: props.refundRequestId,
          ecommerce_customer_id: props.customer.id,
        },
      },
      ...EcommerceRefundResponseRecordTransformer.select(),
    });
  if (!response) {
    throw new HttpException("Response not found", 404);
  }
  return await EcommerceRefundResponseRecordTransformer.transform(response);
}
