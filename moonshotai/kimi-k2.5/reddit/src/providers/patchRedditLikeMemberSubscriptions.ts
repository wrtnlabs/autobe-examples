import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeAttachmentAtSummaryTransformer } from "../transformers/RedditLikeAttachmentAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "../transformers/RedditLikeMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditLikeCommunitySubscription.IRequest;
}): Promise<IPageIRedditLikeCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build community search filter if provided
  const communityWhere = (
    props.body.search
      ? {
          deleted_at: null,
          name: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        }
      : { deleted_at: null }
  ) satisfies Prisma.reddit_like_communitiesWhereInput;
  // Determine sort order
  const sort = props.body.sort ?? "-created_at";
  const orderBy = (
    sort === "name"
      ? { community: { name: "asc" as const } }
      : sort === "-name"
        ? { community: { name: "desc" as const } }
        : sort === "created_at"
          ? { created_at: "asc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.reddit_like_community_subscriptionsOrderByWithRelationInput;
  // Fetch subscriptions with community data
  const subscriptions =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findMany({
      where: {
        reddit_like_member_id: props.member.id,
        deleted_at: null,
        community: communityWhere,
      },
      skip,
      take: limit,
      orderBy,
      select: {
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            owner: RedditLikeMemberAtSummaryTransformer.select(),
            iconAttachment: RedditLikeAttachmentAtSummaryTransformer.select(),
            subscriptions: {
              where: { deleted_at: null },
              select: { id: true },
            } satisfies Prisma.reddit_like_community_subscriptionsFindManyArgs,
          },
        },
      },
    });
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_like_community_subscriptions.count(
    {
      where: {
        reddit_like_member_id: props.member.id,
        deleted_at: null,
        community: communityWhere,
      },
    },
  );
  // Transform to response DTOs
  const data: IRedditLikeCommunity.ISummary[] = await ArrayUtil.asyncMap(
    subscriptions,
    async (sub) => {
      const community = sub.community;
      return {
        id: community.id,
        name: community.name,
        description: community.description,
        owner: await RedditLikeMemberAtSummaryTransformer.transform(
          community.owner,
        ),
        icon: community.iconAttachment
          ? await RedditLikeAttachmentAtSummaryTransformer.transform(
              community.iconAttachment,
            )
          : null,
        subscriberCount: community.subscriptions.length,
        createdAt: community.created_at.toISOString(),
      } satisfies IRedditLikeCommunity.ISummary;
    },
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageIRedditLikeCommunity.ISummary;
}
