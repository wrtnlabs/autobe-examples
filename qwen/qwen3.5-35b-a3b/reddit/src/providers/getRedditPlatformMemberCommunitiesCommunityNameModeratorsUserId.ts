import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformModeratorHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformModeratorHistoryTransformer } from "../transformers/RedditPlatformModeratorHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberCommunitiesCommunityNameModeratorsUserId(props: {
  member: MemberPayload;
  communityName: string;
  userId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformModeratorHistory> {
  const community = await MyGlobal.prisma.reddit_platform_communities.findFirst(
    {
      where: { name: props.communityName, deleted_at: null },
      select: { id: true },
    },
  );
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const history =
    await MyGlobal.prisma.reddit_platform_moderator_histories.findFirstOrThrow({
      where: {
        community_id: community.id,
        user_id: props.userId,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      ...RedditPlatformModeratorHistoryTransformer.select(),
    });
  return await RedditPlatformModeratorHistoryTransformer.transform(history);
}
