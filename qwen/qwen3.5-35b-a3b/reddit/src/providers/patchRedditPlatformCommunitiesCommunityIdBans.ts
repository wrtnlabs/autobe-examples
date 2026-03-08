import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityBan";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommunityAtSummaryTransformer } from "../transformers/RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformCommunityBanAtSummaryTransformer } from "../transformers/RedditPlatformCommunityBanAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "../transformers/RedditPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformCommunitiesCommunityIdBans(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityBan.IRequest;
}): Promise<IPageIRedditPlatformCommunityBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true, owner_id: true },
    });
  const currentMemberId = "current_user_id_placeholder"; // TODO: Get from auth context
  await MyGlobal.prisma.reddit_platform_community_moderators.findFirstOrThrow({
    where: {
      community_id: props.communityId,
      user_id: currentMemberId,
    },
  });
  const now = new Date();
  const whereInput: Prisma.reddit_platform_community_bansWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
    ...(props.body.userId && { user_id: props.body.userId }),
    ...(props.body.startDate && {
      created_at: { gte: new Date(props.body.startDate) },
    }),
    ...(props.body.endDate && {
      created_at: { lte: new Date(props.body.endDate) },
    }),
    ...(props.body.status === "expired"
      ? { expires_at: { lte: now } }
      : props.body.status === "removed"
        ? { deleted_at: { not: null } }
        : {}),
  };
  const orderByInput: Prisma.reddit_platform_community_bansOrderByWithRelationInput =
    (() => {
      switch (props.body.sortBy) {
        case "deleted_at":
          return {
            deleted_at: (props.body.sortOrder ?? "desc") as "asc" | "desc",
          };
        case "expires_at":
          return {
            expires_at: (props.body.sortOrder ?? "desc") as "asc" | "desc",
          };
        default:
          return {
            created_at: (props.body.sortOrder ?? "desc") as "asc" | "desc",
          };
      }
    })();
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_community_bans.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      include: {
        bannedUser: RedditPlatformMemberAtSummaryTransformer.select(),
        bannedBy: RedditPlatformMemberAtSummaryTransformer.select(),
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
      },
    }),
    MyGlobal.prisma.reddit_platform_community_bans.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      async (ban) =>
        await RedditPlatformCommunityBanAtSummaryTransformer.transform({
          id: ban.id,
          created_at: ban.created_at,
          updated_at: ban.updated_at,
          deleted_at: ban.deleted_at,
          expires_at: ban.expires_at,
          bannedBy: ban.bannedBy,
          community: ban.community,
          bannedUser: ban.bannedUser,
        }),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
