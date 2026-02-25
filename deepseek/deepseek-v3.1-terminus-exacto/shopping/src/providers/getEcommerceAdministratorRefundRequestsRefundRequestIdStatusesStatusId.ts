import { IEcommerceRefundRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceRefundRequestStatusTransformer } from "../transformers/EcommerceRefundRequestStatusTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorRefundRequestsRefundRequestIdStatusesStatusId(props: {
  administrator: AdministratorPayload;
  refundRequestId: string & tags.Format<"uuid">;
  statusId: string & tags.Format<"uuid">;
}): Promise<IEcommerceRefundRequestStatus> {
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
