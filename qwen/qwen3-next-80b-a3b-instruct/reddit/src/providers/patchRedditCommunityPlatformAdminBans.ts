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
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { RedditCommunityBanOfMemberAtSummaryTransformer } from "../transformers/RedditCommunityBanOfMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPlatformAdminBans(props: {
  platformAdmin: PlatformadminPayload;
  body: IRedditCommunityBanOfMember.IRequest;
}): Promise<IPageIRedditCommunityBanOfMember.ISummary> {
  const page = 1;
  const limit = Math.min(10, 50); // Default 10, max 50
  const skip = (page - 1) * limit;
  // Build WHERE clause dynamically from request filters
  const where: Prisma.reddit_community_bansWhereInput = {
    deleted_at: null,
    ...(props.body.community_id && { community_id: props.body.community_id }),
    ...(props.body.banned_member_id && {
      banned_member_id: props.body.banned_member_id,
    }),
    ...(props.body.banned_moderator_id && {
      banned_moderator_id: props.body.banned_moderator_id,
    }),
    ...(props.body.banned_owner_id && {
      banned_owner_id: props.body.banned_owner_id,
    }),
    ...(props.body.deleted_at !== undefined && {
      deleted_at: props.body.deleted_at === true ? { not: null } : null,
    }),
  };
  // Fetch bans with resolved relations using transformer select()
  const data = await MyGlobal.prisma.reddit_community_bans.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditCommunityBanOfMemberAtSummaryTransformer.select(),
  });
  // Fetch total count for pagination
  const total = await MyGlobal.prisma.reddit_community_bans.count({ where });
  // Transform each entry using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityBanOfMemberAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
