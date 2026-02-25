import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityGuestSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSummary";
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

export async function getRedditCommunityPlatformAdminUsersUserIdSummary(props: {
  platformAdmin: PlatformadminPayload;
  userId: string;
}): Promise<IRedditCommunityGuestSummary> {
  const user = await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow(
    {
      where: { id: props.userId },
      select: {
        display_name: true,
        bio: true,
        avatar_url: true,
        karma_score: true,
      },
    },
  );
  const [postCount, commentCount] = await Promise.all([
    MyGlobal.prisma.reddit_community_posts.count({
      where: { author_id: props.userId, is_deleted: false },
    }),
    MyGlobal.prisma.reddit_community_comments.count({
      where: { author_id: props.userId, deleted_at: null },
    }),
  ]);
  return {
    display_name: user.display_name ?? "",
    bio: user.bio ?? "",
    avatar_url: user.avatar_url ?? "",
    karma_score: user.karma_score,
    total_post_count: postCount,
    total_comment_count: commentCount,
  };
}
