import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommunityAtSummaryTransformer } from "../transformers/RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "../transformers/RedditCommunityMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPosts(props: {
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_postsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      title: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.community_id && {
      community_id: props.body.community_id,
    }),
  } satisfies Prisma.reddit_community_postsWhereInput;
  const [posts, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_posts.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        title: true,
        post_type: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        text: { select: { body: true } },
        link: { select: { domain_name: true } },
        author: RedditCommunityMemberAtSummaryTransformer.select(),
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
      },
    }),
    MyGlobal.prisma.reddit_community_posts.count({ where: whereInput }),
  ]);
  const transformed = await ArrayUtil.asyncMap(posts, async (post) => {
    let previewContent: string | null = null;
    switch (post.post_type) {
      case "text":
        previewContent = post.text?.body
          ? post.text.body.substring(0, 200)
          : null;
        break;
      case "link":
        previewContent = post.link?.domain_name ?? null;
        break;
      case "image":
        previewContent = null;
        break;
    }
    return {
      id: post.id,
      title: post.title,
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        post.author,
      ),
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        post.community,
      ),
      vote_score: post.vote_score,
      comment_count: post.comment_count,
      created_at: toISOStringSafe(post.created_at),
      post_type: post.post_type as "text" | "link" | "image",
      preview_content: previewContent,
    } satisfies IRedditCommunityPost.ISummary;
  });
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
