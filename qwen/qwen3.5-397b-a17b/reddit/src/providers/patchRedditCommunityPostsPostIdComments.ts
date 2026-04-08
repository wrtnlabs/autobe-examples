import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommentAtSummaryTransformer } from "../transformers/RedditCommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  const limit = Math.min(props.body.limit ?? 20, 100);
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_commentsWhereInput = {
    reddit_community_post_id: props.postId,
    deleted_at: null,
    ...(props.body.parentCommentId !== undefined &&
      props.body.parentCommentId !== null && {
        reddit_community_comment_id: props.body.parentCommentId,
      }),
  };
  const allComments = await MyGlobal.prisma.reddit_community_comments.findMany({
    where: whereInput,
    ...RedditCommunityCommentAtSummaryTransformer.select(),
  });
  const sort = props.body.sort ?? "new";
  let sortedComments = allComments;
  if (sort === "best") {
    sortedComments = [...allComments].sort((a, b) => {
      const scoreA = a.votes.reduce((sum, vote) => sum + vote.value, 0);
      const scoreB = b.votes.reduce((sum, vote) => sum + vote.value, 0);
      return scoreB - scoreA;
    });
  } else if (sort === "controversial") {
    sortedComments = [...allComments].sort((a, b) => {
      const scoreA = a.votes.reduce((sum, vote) => sum + vote.value, 0);
      const scoreB = b.votes.reduce((sum, vote) => sum + vote.value, 0);
      const votesA = a.votes.length;
      const votesB = b.votes.length;
      const absA = Math.abs(scoreA);
      const absB = Math.abs(scoreB);
      if (absA !== absB) {
        return absA - absB;
      }
      return votesB - votesA;
    });
  } else {
    sortedComments = [...allComments].sort((a, b) => {
      return b.created_at.getTime() - a.created_at.getTime();
    });
  }
  let paginatedComments = sortedComments;
  const hasCursor =
    props.body.created_at !== undefined && props.body.id !== undefined;
  if (hasCursor && props.body.created_at !== null && props.body.id !== null) {
    const cursorIndex = sortedComments.findIndex((c) => {
      const commentCreatedAt = c.created_at.toISOString();
      return (
        commentCreatedAt === props.body.created_at && c.id === props.body.id
      );
    });
    if (cursorIndex !== -1) {
      paginatedComments = sortedComments.slice(cursorIndex + 1);
    }
  } else {
    paginatedComments = sortedComments.slice(skip, skip + limit);
  }
  const total = allComments.length;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      paginatedComments,
      RedditCommunityCommentAtSummaryTransformer.transform,
    ),
  };
}
