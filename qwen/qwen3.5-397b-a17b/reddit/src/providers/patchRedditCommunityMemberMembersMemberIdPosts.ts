import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberMembersMemberIdPosts(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const member = await MyGlobal.prisma.reddit_community_members.findUnique({
    where: { id: props.memberId, deleted_at: null },
  });
  if (!member) {
    throw new HttpException("Member not found", 404);
  }
  const whereInput: Prisma.reddit_community_postsWhereInput = {
    reddit_community_member_id: props.memberId,
    deleted_at: null,
    ...(props.body.postType && { post_type: props.body.postType }),
  };
  const orderByInput: Prisma.reddit_community_postsOrderByWithRelationInput =
    props.body.sort === "new"
      ? { created_at: "desc" }
      : props.body.sort === "top"
        ? {
            votes: {
              _count: "desc",
            },
          }
        : { created_at: "desc" };
  const timeFilter = props.body.timeFilter;
  if (timeFilter && timeFilter !== "all") {
    const now = new Date();
    const dateFilter =
      timeFilter === "today"
        ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
        : timeFilter === "week"
          ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          : timeFilter === "month"
            ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            : timeFilter === "year"
              ? new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
              : undefined;
    if (dateFilter) {
      whereInput.created_at = { gte: dateFilter };
    }
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_posts.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCommunityPostAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_posts.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
