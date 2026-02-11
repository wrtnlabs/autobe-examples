import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanOfMember";
import { IRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanOfMember";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { RedditCommunityBanOfMemberAtSummaryTransformer } from "../transformers/RedditCommunityBanOfMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunityOwnerCommunitiesCommunityIdBans(props: {
  communityOwner: CommunityownerPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityBanOfMember.IRequest;
}): Promise<IPageIRedditCommunityBanOfMember.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_community_bansWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
    OR: [
      { banned_member_id: { not: null } },
      { banned_owner_id: { not: null } },
      { banned_moderator_id: { not: null } },
    ],
  };
  const data = await MyGlobal.prisma.reddit_community_bans.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditCommunityBanOfMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_bans.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityBanOfMemberAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
