import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
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

export async function getRedditCommunityPlatformAdminUsersUserId(props: {
  platformAdmin: PlatformadminPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityMember.ISummary> {
  const user = await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow(
    {
      where: { id: props.userId },
      select: {
        id: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma_score: true,
        created_at: true,
      },
    },
  );
  const postCount = await MyGlobal.prisma.reddit_community_posts.count({
    where: { author_id: props.userId },
  });
  const commentCount = await MyGlobal.prisma.reddit_community_comments.count({
    where: { author_id: props.userId },
  });
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    bio: user.bio ?? undefined,
    avatar_url: user.avatar_url ?? undefined,
    karma_score: Number(user.karma_score),
    created_at: toISOStringSafe(user.created_at),
  };
}
