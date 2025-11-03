import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUser> {
  // Only allow users to fetch their own profile
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only access your own user profile",
      403,
    );
  }
  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      id: props.userId,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at !== null ? toISOStringSafe(user.deleted_at) : null,
  };
}
