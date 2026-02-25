import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBan";
import { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { RedditCommunityBanAtSummaryTransformer } from "../transformers/RedditCommunityBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunityOwnerBansUserId(props: {
  communityOwner: CommunityownerPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditCommunityBan.ISummary> {
  const page = 1;
  const limit = Math.min(100, 1000); // Max 1000 per page
  const skip = (page - 1) * limit;
  const bans = await MyGlobal.prisma.reddit_community_bans.findMany({
    where: {
      user_id: props.userId,
      is_active: true,
    },
    orderBy: {
      created_at: "desc",
    },
    skip,
    take: limit,
    ...RedditCommunityBanAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_bans.count({
    where: {
      user_id: props.userId,
      is_active: true,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      bans,
      RedditCommunityBanAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
