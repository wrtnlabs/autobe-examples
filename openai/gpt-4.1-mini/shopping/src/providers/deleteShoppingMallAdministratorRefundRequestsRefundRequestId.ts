import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdministratorRefundRequestsRefundRequestId(props: {
  administrator: AdministratorPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
    where: { id: props.refundRequestId },
  });
  await MyGlobal.prisma.shopping_mall_refund_requests.delete({
    where: { id: props.refundRequestId },
  });
  await MyGlobal.prisma.shopping_mall_administrative_audit_logs.create({
    data: {
      id: v4(),
      administrator_id: props.administrator.id,
      target_table: "shopping_mall_refund_requests",
      target_id: props.refundRequestId,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
