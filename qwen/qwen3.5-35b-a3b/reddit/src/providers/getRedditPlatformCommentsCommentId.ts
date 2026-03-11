import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommentAtSummaryTransformer } from "../transformers/RedditPlatformCommentAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "../transformers/RedditPlatformMemberAtSummaryTransformer";
import { RedditPlatformPostAtSummaryTransformer } from "../transformers/RedditPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformCommentsCommentId(props: {
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformComment> {
  const comment =
    await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        content: true,
        vote_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: RedditPlatformMemberAtSummaryTransformer.select(),
        post: RedditPlatformPostAtSummaryTransformer.select(),
        parent: RedditPlatformCommentAtSummaryTransformer.select(),
        replies: RedditPlatformCommentAtSummaryTransformer.select(),
      },
    });
  return {
    id: comment.id,
    content: comment.content,
    vote_score: comment.vote_score,
    author: await RedditPlatformMemberAtSummaryTransformer.transform(
      comment.author,
    ),
    post: comment.post
      ? await RedditPlatformPostAtSummaryTransformer.transform(comment.post)
      : null,
    parent: comment.parent
      ? await RedditPlatformCommentAtSummaryTransformer.transform(
          comment.parent,
        )
      : null,
    replies: await ArrayUtil.asyncMap(comment.replies, (reply) =>
      RedditPlatformCommentAtSummaryTransformer.transform(reply),
    ),
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
  } satisfies IRedditPlatformComment;
}
