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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformModeratorHistoryTransformer } from "../transformers/RedditPlatformModeratorHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformAdminCommunitiesCommunityIdModeratorHistoriesHistoryId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformModeratorHistory> {
  const [history, communityModerator] = await Promise.all([
    MyGlobal.prisma.reddit_platform_moderator_histories.findUniqueOrThrow({
      where: {
        id: props.historyId,
        deleted_at: null,
      },
      ...RedditPlatformModeratorHistoryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.admin.id,
      },
    }),
  ]);
  if (communityModerator === null) {
    throw new HttpException("You are not a moderator of this community", 403);
  }
  if (history.community.id !== props.communityId) {
    throw new HttpException(
      "History record does not belong to this community",
      404,
    );
  }
  return await RedditPlatformModeratorHistoryTransformer.transform(history);
}
