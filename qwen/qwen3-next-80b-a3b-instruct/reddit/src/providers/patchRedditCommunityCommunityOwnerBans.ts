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

export async function patchRedditCommunityCommunityOwnerBans(props: {
  communityOwner: CommunityownerPayload;
  body: IRedditCommunityBanOfMember.IRequest;
}): Promise<IPageIRedditCommunityBanOfMember.ISummary> {
  // Fixed pagination: 100 records per page, no configurable page parameter
  const limit = 100;
  const skip = 0;
  // Build dynamic where condition based on filters
  const whereInput = {
    deleted_at:
      props.body.deleted_at === undefined
        ? undefined
        : props.body.deleted_at === null
          ? null
          : { not: null },
    ...(props.body.community_id && { community_id: props.body.community_id }),
    ...(props.body.banned_member_id && {
      banned_member_id: props.body.banned_member_id,
    }),
    ...(props.body.banned_owner_id && {
      banned_owner_id: props.body.banned_owner_id,
    }),
    ...(props.body.banned_moderator_id && {
      banned_moderator_id: props.body.banned_moderator_id,
    }),
  } satisfies Prisma.reddit_community_bansWhereInput;
  // Fetch data with transformer-select and limit/skip
  const data = await MyGlobal.prisma.reddit_community_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" } as const,
    ...RedditCommunityBanOfMemberAtSummaryTransformer.select(),
  });
  // Count total matching records
  const total = await MyGlobal.prisma.reddit_community_bans.count({
    where: whereInput,
  });
  // Transform data using the loaded transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityBanOfMemberAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: 1,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
