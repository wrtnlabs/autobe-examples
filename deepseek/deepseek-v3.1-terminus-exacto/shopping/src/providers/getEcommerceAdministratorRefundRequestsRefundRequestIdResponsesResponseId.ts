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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceRefundResponseRecordTransformer } from "../transformers/EcommerceRefundResponseRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorRefundRequestsRefundRequestIdResponsesResponseId(props: {
  administrator: AdministratorPayload;
  refundRequestId: string & tags.Format<"uuid">;
  responseId: string & tags.Format<"uuid">;
}): Promise<IEcommerceRefundResponseRecord> {
  const response =
    await MyGlobal.prisma.ecommerce_refund_response_records.findUniqueOrThrow({
      where: {
        id: props.responseId,
        ecommerce_refund_request_id: props.refundRequestId,
      },
      ...EcommerceRefundResponseRecordTransformer.select(),
    });
  return await EcommerceRefundResponseRecordTransformer.transform(response);
}
