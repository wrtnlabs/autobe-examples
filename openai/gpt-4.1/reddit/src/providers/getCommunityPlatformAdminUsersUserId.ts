import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminUsersUserId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUser> {
  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new HttpException("User not found or has been deleted.", 404);
  }
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null ? null : toISOStringSafe(user.deleted_at),
  };
}
