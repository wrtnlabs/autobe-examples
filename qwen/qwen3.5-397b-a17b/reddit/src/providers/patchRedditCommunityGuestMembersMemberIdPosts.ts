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

export async function patchRedditCommunityGuestMembersMemberIdPosts(props: {
  guest: GuestPayload;
  memberId: string & tags.Format<"uuid">;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow({
    where: {
      id: props.memberId,
      deleted_at: null,
    },
  });
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const timeFilterDate = (() => {
    if (props.body.sort !== "top") {
      return undefined;
    }
    const timeFilter = props.body.timeFilter ?? "all";
    if (timeFilter === "all") {
      return undefined;
    }
    const now = new Date();
    switch (timeFilter) {
      case "today":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "week":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "month":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "year":
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return undefined;
    }
  })();
  const whereInput = {
    reddit_community_member_id: props.memberId,
    deleted_at: null,
    ...(timeFilterDate && {
      created_at: { gte: timeFilterDate },
    }),
    ...(props.body.postType && {
      post_type: props.body.postType,
    }),
  } satisfies Prisma.reddit_community_postsWhereInput;
  const orderByInput = (() => {
    const sort = props.body.sort ?? "new";
    switch (sort) {
      case "new":
        return { created_at: "desc" as const };
      case "top":
        return { created_at: "desc" as const };
      case "hot":
        return { created_at: "desc" as const };
      case "controversial":
        return { created_at: "desc" as const };
      default:
        return { created_at: "desc" as const };
    }
  })() satisfies Prisma.reddit_community_postsOrderByWithRelationInput;
  const posts = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      posts,
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
