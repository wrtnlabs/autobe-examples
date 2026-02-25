import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityPlatformAdminUsersUserIdMetrics(props: {
  platformAdmin: PlatformadminPayload;
  userId: string;
}): Promise<IRedditCommunityGuest.IMetric> {
  await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow({
    where: { id: props.userId },
  });
  const postCount = await MyGlobal.prisma.reddit_community_posts.count({
    where: {
      author_id: props.userId,
      is_deleted: false,
    },
  });
  const commentCount = await MyGlobal.prisma.reddit_community_comments.count({
    where: {
      author_id: props.userId,
      deleted_at: null,
    },
  });
  return {
    postCount,
    commentCount,
  } satisfies IRedditCommunityGuest.IMetric;
}
