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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityBanAtSummaryTransformer } from "../transformers/RedditPlatformCommunityBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityBan.IRequest;
}): Promise<IPageIRedditPlatformCommunityBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const skip = (page - 1) * limit;
  const community = await MyGlobal.prisma.reddit_platform_communities.findFirst(
    {
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
      },
    },
  );
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const isModerator = await MyGlobal.prisma.reddit_platform_community_moderators
    .findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.member.id,
      },
    })
    .then((result) => result !== null);
  if (community.owner_id !== props.member.id && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  const whereInput: Prisma.reddit_platform_community_bansWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
    ...(props.body.userId !== undefined && {
      user_id: props.body.userId,
    }),
    ...(props.body.username !== undefined && {
      bannedUser: {
        username: {
          contains: props.body.username,
        },
      },
    }),
    ...(props.body.bannedBy !== undefined && {
      banned_by: props.body.bannedBy,
    }),
    ...(props.body.fromCreatedAt !== undefined && {
      created_at: {
        gte: toISOStringSafe(new Date(props.body.fromCreatedAt)),
      },
    }),
    ...(props.body.toCreatedAt !== undefined && {
      created_at: {
        lte: toISOStringSafe(new Date(props.body.toCreatedAt)),
      },
    }),
    ...(props.body.status === "active" && {
      deleted_at: null,
      OR: [
        { expires_at: null },
        { expires_at: { gt: toISOStringSafe(new Date()) } },
      ],
    }),
    ...(props.body.status === "expired" && {
      deleted_at: null,
      expires_at: { lte: toISOStringSafe(new Date()) },
    }),
  };
  const orderByInput: Prisma.reddit_platform_community_bansOrderByWithRelationInput =
    (
      props.body.sortBy === "user_id"
        ? { user_id: "asc" as const }
        : props.body.sortBy === "banned_by"
          ? { banned_by: "asc" as const }
          : props.body.sortBy === "expires_at"
            ? { expires_at: "asc" as const }
            : { created_at: "desc" as const }
    ) satisfies Prisma.reddit_platform_community_bansOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_community_bans.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditPlatformCommunityBanAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_platform_community_bans.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformCommunityBanAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
