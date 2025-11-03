import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Confirm the target admin exists (404 if not found)
  await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
    where: { id: props.adminId },
  });

  // 2. Prevent deleting the last remaining admin (must be at least one other active)
  const adminCount = await MyGlobal.prisma.community_platform_admins.count({
    where: {
      id: { not: props.adminId },
      deleted_at: null,
    },
  });
  if (adminCount === 0) {
    throw new HttpException("Cannot delete the last remaining admin", 400);
  }

  // 3. Hard delete the admin
  await MyGlobal.prisma.community_platform_admins.delete({
    where: { id: props.adminId },
  });
}
