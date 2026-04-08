import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunitySubscription";
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
import { RedditLikeCommunitySubscriptionAtSummaryTransformer } from "../transformers/RedditLikeCommunitySubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditLikeCommunitySubscription.IRequest;
}): Promise<IPageIRedditLikeCommunitySubscription.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const offset = props.body.offset ?? 0;
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  if (offset < 0) {
    throw new HttpException("Offset must be non-negative", 400);
  }
  if (page !== undefined && page !== null && page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  const usePageBased = page !== undefined && page !== null;
  const effectivePage = usePageBased ? Math.max(1, page) : 1;
  const skip = usePageBased ? (effectivePage - 1) * limit : offset;
  const whereInput: Prisma.reddit_like_community_subscriptionsWhereInput = {
    reddit_like_member_id: props.member.id,
    deleted_at: null,
    ...(props.body.community_id !== undefined && {
      reddit_like_community_id: props.body.community_id,
    }),
  } satisfies Prisma.reddit_like_community_subscriptionsWhereInput;
  const sort = props.body.sort ?? "created_at:desc";
  const sortParts = sort.split(":");
  const sortField = sortParts[0] ?? "created_at";
  const sortDirectionRaw = sortParts[1] ?? "desc";
  const sortDirection =
    sortDirectionRaw === "asc" || sortDirectionRaw === "desc"
      ? sortDirectionRaw
      : "desc";
  const orderByInput: Prisma.reddit_like_community_subscriptionsOrderByWithRelationInput =
    sortField === "created_at"
      ? { created_at: sortDirection }
      : { created_at: "desc" };
  const records =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditLikeCommunitySubscriptionAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.reddit_like_community_subscriptions.count(
    {
      where: whereInput,
    },
  );
  const currentPage = effectivePage;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const data = await ArrayUtil.asyncMap(
    records,
    RedditLikeCommunitySubscriptionAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: currentPage,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIRedditLikeCommunitySubscription.ISummary;
}
