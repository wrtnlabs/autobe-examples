import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminUsersUserId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the user by ID
  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: props.userId },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // If the user is already soft-deleted, operation is idempotent
  if (user.deleted_at !== null) {
    return;
  }

  // Soft-delete the user
  await MyGlobal.prisma.community_platform_users.update({
    where: { id: props.userId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
