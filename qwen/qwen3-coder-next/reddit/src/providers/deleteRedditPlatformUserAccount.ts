import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditPlatformUserAccount(props: {
  user: UserPayload;
}): Promise<IRedditPlatformUser.IDeleteResponse> {
  // Delete user sessions using correct field name
  await MyGlobal.prisma.reddit_platform_user_sessions.deleteMany({
    where: { reddit_platform_user_id: props.user.id },
  });
  // Delete user activity logs
  await MyGlobal.prisma.reddit_platform_user_activity_logs.deleteMany({
    where: { user_id: props.user.id },
  });
  // Delete comments created by user
  await MyGlobal.prisma.reddit_platform_comments.deleteMany({
    where: { author_id: props.user.id },
  });
  // Delete posts created by user
  await MyGlobal.prisma.reddit_platform_posts.deleteMany({
    where: { author_id: props.user.id },
  });
  // Delete the user account
  await MyGlobal.prisma.reddit_platform_users.delete({
    where: { id: props.user.id },
  });
  return {};
}
