import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPostText";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityAtSummaryTransformer } from "../transformers/RedditCommunityAtSummaryTransformer";
import { RedditMemberAtSummaryTransformer } from "../transformers/RedditMemberAtSummaryTransformer";
import { RedditPostTextAtSummaryTransformer } from "../transformers/RedditPostTextAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditSearchPosts(props: {
  body: IRedditPostText.IRequest;
}): Promise<IPageIRedditPostText.ISummary> {
  const { search, sort, postType, page = 1, limit = 100 } = props.body;
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;
  const where: Prisma.reddit_postsWhereInput[] = [{ deleted_at: null }];
  if (search) {
    where.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { text: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  if (postType) {
    where.push({ post_type: { in: [postType] } });
  }
  let orderBy: Prisma.reddit_postsOrderByWithRelationInput = {
    created_at: "desc",
  };
  const posts = await MyGlobal.prisma.reddit_posts.findMany({
    where: { AND: where },
    skip,
    take: safeLimit,
    orderBy,
    select: {
      id: true,
      title: true,
      post_type: true,
      text: true,
      community: RedditCommunityAtSummaryTransformer.select(),
      author: RedditMemberAtSummaryTransformer.select(),
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_posts.count({
    where: { AND: where },
  });
  const postsWithSafeDates = posts.map((post) => ({
    ...post,
    created_at: toISOStringSafe(post.created_at),
  }));
  const data = await ArrayUtil.asyncMap(
    postsWithSafeDates,
    RedditPostTextAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
  };
}
