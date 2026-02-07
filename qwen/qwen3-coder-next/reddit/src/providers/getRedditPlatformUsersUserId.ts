import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformUsersUserId(props: {
  userId: string;
}): Promise<IRedditPlatformUser> {
  const user = await MyGlobal.prisma.reddit_platform_users.findUnique({
    where: { id: props.userId },
    select: {
      id: true,
      email: true,
      username: true,
      password_hash: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma_score: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    password_hash: user.password_hash,
    display_name: user.display_name === null ? undefined : user.display_name,
    bio: user.bio === null ? undefined : user.bio,
    avatar_url: user.avatar_url === null ? undefined : user.avatar_url,
    karma_score: user.karma_score,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
  };
}
