import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminRoleEscalationsRoleEscalationId(props: {
  admin: AdminPayload;
  roleEscalationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Retrieve the role escalation request to verify existence
  const roleEscalation =
    await MyGlobal.prisma.shopping_mall_role_escalations.findUnique({
      where: { id: props.roleEscalationId },
    });
  if (!roleEscalation) {
    throw new HttpException("Role escalation request not found", 404);
  }

  // 2. Hard delete the record
  await MyGlobal.prisma.shopping_mall_role_escalations.delete({
    where: { id: props.roleEscalationId },
  });
}
