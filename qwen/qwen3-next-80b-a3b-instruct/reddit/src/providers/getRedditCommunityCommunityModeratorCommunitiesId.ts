import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { RedditCommunityCommunityAtSummaryTransformer } from "../transformers/RedditCommunityCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityCommunityModeratorCommunitiesId(props: {
  communityModerator: CommunitymoderatorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunity.ISummary> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: props.id, deleted_at: null },
      ...RedditCommunityCommunityAtSummaryTransformer.select(),
    });
  if (!community) throw new HttpException("Community not found", 404);
  return await RedditCommunityCommunityAtSummaryTransformer.transform(
    community,
  );
}
