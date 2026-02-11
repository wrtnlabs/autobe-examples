import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanOfMember";
import { IRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanOfMember";
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

export async function patchRedditCommunityPlatformAdminCommunitiesCommunityIdBans(props: {
  platformAdmin: PlatformadminPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityBanOfMember.IRequest;
}): Promise<IPageIRedditCommunityBanOfMember.IS> {
  // Pagination parameters are not part of IRedditCommunityBanOfMember.IRequest
  // They are handled externally via route decorators (e.g., @Query() in NestJS)
  // We return fixed defaults: page 1, limit 100
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Build dynamic where condition with optional filters
  const whereInput = {
    community_id: props.communityId,
    // Only include bans where one of the banned actor fields is set
    OR: [
      { banned_member_id: { not: null } },
      { banned_owner_id: { not: null } },
      { banned_moderator_id: { not: null } },
    ],
    // Optional filters from request body
    ...(props.body.banned_member_id && {
      banned_member_id: props.body.banned_member_id,
    }),
    ...(props.body.banned_owner_id && {
      banned_owner_id: props.body.banned_owner_id,
    }),
    ...(props.body.banned_moderator_id && {
      banned_moderator_id: props.body.banned_moderator_id,
    }),
    ...(props.body.deleted_at === true
      ? { deleted_at: { not: null } }
      : props.body.deleted_at === false
        ? { deleted_at: null }
        : {}),
  } satisfies Prisma.reddit_community_bansWhereInput;
  // Use transformer select() definitions to ensure type-safe field selection
  const data = await MyGlobal.prisma.reddit_community_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditCommunityBanOfMemberAtSummaryTransformer.select(),
  });
  // Transform using the standardized transformer
  const transformedData = await Promise.all(
    data.map(RedditCommunityBanOfMemberAtSummaryTransformer.transform),
  );
  // Map to match IRedditCommunityBanOfMember.IS structure exactly — field is 'bannedUser', not 'banned_actor'
  const mappedData: IPageIRedditCommunityBanOfMember.IS["data"] =
    transformedData.map((item) => ({
      ...item,
      bannedUser: item.banned_actor,
      banned_actor: undefined,
    }));
  // Count total active bans matching criteria
  const total = await MyGlobal.prisma.reddit_community_bans.count({
    where: whereInput,
  });
  return {
    data: mappedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
