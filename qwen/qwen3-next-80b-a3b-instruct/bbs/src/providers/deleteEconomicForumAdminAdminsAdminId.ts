import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteEconomicForumAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Query admin record
  const admin = await MyGlobal.prisma.economic_forum_admins.findUnique({
    where: { id: props.adminId },
  });
  // Validate admin exists
  if (!admin) {
    throw new HttpException("Admin not found", 404);
  }
  // Delete admin record
  await MyGlobal.prisma.economic_forum_admins.delete({
    where: { id: props.adminId },
  });
  // Log audit entry
  await MyGlobal.prisma.economic_forum_system_audits.create({
    data: {
      id: v4(),
      action: "ADMIN_DELETE",
      admin_id: props.admin.id,
      details: JSON.stringify(admin),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
