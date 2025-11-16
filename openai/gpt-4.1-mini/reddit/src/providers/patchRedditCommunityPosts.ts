import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function patchRedditCommunityPosts(props: {
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit >= 1 && props.body.limit <= 100 ? props.body.limit : 20;
  const skip = (page - 1) * limit;

  const whereCondition = {
    AND: [
      {
        OR: [
          props.body.search
            ? { title: { contains: props.body.search } }
            : undefined,
          props.body.search
            ? { content: { contains: props.body.search } }
            : undefined,
        ].filter((cond) => cond !== undefined),
      },
      props.body.community_code
        ? { community_code: props.body.community_code }
        : undefined,
      props.body.author_id
        ? { reddit_registered_user_id: props.body.author_id }
        : undefined,
    ].filter((cond) => cond !== undefined),
    deleted_at: null,
  };

  type SortOrder = "asc" | "desc";

  const orderByCondition: { [key: string]: SortOrder } =
    props.body.sort_by === "hot"
      ? { score: "desc" }
      : props.body.sort_by === "new"
        ? { created_at: "desc" }
        : props.body.sort_by === "top"
          ? { score: "desc" }
          : props.body.sort_by === "controversial"
            ? { controversial_score: "desc" }
            : { created_at: "desc" };

  const [posts, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_posts.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
      select: {
        id: true,
        title: true,
        reddit_registered_user_id: true,
        created_at: true,
        content: false,
      },
    }),
    MyGlobal.prisma.reddit_community_posts.count({ where: whereCondition }),
  ]);

  const authorIds = posts.map((post) => post.reddit_registered_user_id);

  const authors =
    await MyGlobal.prisma.reddit_community_registered_users.findMany({
      where: { id: { in: authorIds } },
      select: {
        id: true,
      },
    });
  const authorMap = new Map(authors.map((author) => [author.id, author]));

  const votes = await MyGlobal.prisma.reddit_community_post_votes.groupBy({
    by: [
      Prisma.Reddit_community_post_votesScalarFieldEnum
        .reddit_community_post_id,
      Prisma.Reddit_community_post_votesScalarFieldEnum.vote_type,
    ],
    where: { reddit_community_post_id: { in: posts.map((p) => p.id) } },
    _count: { _all: true },
  });

  const voteMap = new Map<string, number>();
  for (const v of votes) {
    const current = voteMap.get(v.reddit_community_post_id) ?? 0;
    const count = v._count && v._count._all ? v._count._all : 0;
    voteMap.set(
      v.reddit_community_post_id,
      String(v.vote_type) === "1" ? current + count : current - count,
    );
  }

  const comments = await MyGlobal.prisma.reddit_community_comments.groupBy({
    by: [
      Prisma.Reddit_community_commentsScalarFieldEnum.reddit_community_post_id,
    ],
    where: { reddit_community_post_id: { in: posts.map((p) => p.id) } },
    _count: { _all: true },
  });

  const commentCountMap = new Map<string, number>();
  for (const c of comments) {
    const count = c._count && c._count._all ? c._count._all : 0;
    commentCountMap.set(c.reddit_community_post_id, count);
  }

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: posts.map((post) => ({
      id: post.id as string & tags.Format<"uuid">,
      title: post.title,
      author: {
        id: authorMap.get(post.reddit_registered_user_id)?.id ?? "",
        username: "",
        profile_image_url: undefined,
      },
      created_at: toISOStringSafe(post.created_at),
      score: voteMap.get(post.id) ?? 0,
      comments_count: commentCountMap.get(post.id) ?? 0,
    })),
  };
}
