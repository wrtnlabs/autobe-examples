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

export async function getRedditPlatformMemberCommunitiesCommunityIdModeratorHistoriesHistoryId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformModeratorHistory> {
  // Verify user is a moderator of the specified community
  const moderation =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.member.id,
      },
    });
  if (moderation === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Query the moderator history record with nested relations
  const history =
    await MyGlobal.prisma.reddit_platform_moderator_histories.findUniqueOrThrow(
      {
        where: {
          id: props.historyId,
          community_id: props.communityId,
          deleted_at: null,
        },
        ...RedditPlatformModeratorHistoryTransformer.select(),
      },
    );
  return await RedditPlatformModeratorHistoryTransformer.transform(history);
}
