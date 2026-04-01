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

export async function patchRedditCommunityMemberCommunitiesCommunityNameFeed(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirstOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    reddit_community_community_id: community.id,
    ...(props.body.postType && { post_type: props.body.postType }),
  } satisfies Prisma.reddit_community_postsWhereInput;
  const sort = props.body.sort ?? "new";
  const timeFilter = props.body.timeFilter ?? "all";
  const orderByInput: Prisma.reddit_community_postsOrderByWithRelationInput =
    (() => {
      if (sort === "top") {
        return { created_at: "desc" };
      } else if (sort === "hot") {
        return { created_at: "desc" };
      } else if (sort === "controversial") {
        return { created_at: "desc" };
      }
      return { created_at: "desc" };
    })();
  const timeFilterDate: Date | undefined = (() => {
    if (timeFilter === "all" || sort !== "top") return undefined;
    const now = new Date();
    if (timeFilter === "today")
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (timeFilter === "week")
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (timeFilter === "month")
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (timeFilter === "year")
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    return undefined;
  })();
  const finalWhere = timeFilterDate
    ? ({
        ...whereInput,
        created_at: { gte: timeFilterDate },
      } satisfies Prisma.reddit_community_postsWhereInput)
    : whereInput;
  const data = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: finalWhere,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: finalWhere,
  });
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
