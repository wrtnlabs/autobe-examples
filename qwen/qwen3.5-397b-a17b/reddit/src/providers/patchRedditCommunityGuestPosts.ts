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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityGuestPosts(props: {
  guest: GuestPayload;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_postsWhereInput = {
    deleted_at: null,
  };
  if (props.body.feedType === "community" && props.body.communityName) {
    const community =
      await MyGlobal.prisma.reddit_community_communities.findUnique({
        where: { name: props.body.communityName, deleted_at: null },
      });
    if (community) {
      whereInput.reddit_community_community_id = community.id;
    }
  }
  if (props.body.postType) {
    whereInput.post_type = props.body.postType;
  }
  if (
    props.body.sort === "top" &&
    props.body.timeFilter &&
    props.body.timeFilter !== "all"
  ) {
    const now = new Date();
    let startDate: Date;
    switch (props.body.timeFilter) {
      case "today":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }
    whereInput.created_at = { gte: startDate };
  }
  let orderByInput: Prisma.reddit_community_postsOrderByWithRelationInput = {
    created_at: "desc",
  };
  if (props.body.sort === "new") {
    orderByInput = { created_at: "desc" };
  } else if (props.body.sort === "top") {
    orderByInput = { created_at: "desc" };
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_posts.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCommunityPostAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_posts.count({ where: whereInput }),
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
