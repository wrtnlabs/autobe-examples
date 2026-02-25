import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { RedditCommunityCommunityAtSummaryTransformer } from "../transformers/RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "../transformers/RedditCommunityMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunityOwnerCommunitiesCommunityIdModerators(props: {
  communityOwner: CommunityownerPayload;
  communityId: string;
}): Promise<IPageIRedditCommunityModerator.ISummary> {
  // Validate community ownership
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { id: props.communityId, owner_user_id: props.communityOwner.id },
    });
  // Fetch all moderators for the community
  const moderators = await MyGlobal.prisma.reddit_community_moderators.findMany(
    {
      where: { community_id: props.communityId },
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        user_id: true,
        community_id: true,
        created_at: true,
        user: RedditCommunityMemberAtSummaryTransformer.select(),
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
      },
    },
  );
  const data = await ArrayUtil.asyncMap(moderators, async (moderator) => {
    return {
      user: await RedditCommunityMemberAtSummaryTransformer.transform(
        moderator.user,
      ),
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        moderator.community,
      ),
      createdAt: moderator.created_at.toISOString(),
    } satisfies IRedditCommunityModerator.ISummary;
  });
  return {
    data,
    pagination: {
      current: 1,
      limit: 100,
      records: data.length,
      pages: 1,
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCommunityModerator.ISummary;
}
