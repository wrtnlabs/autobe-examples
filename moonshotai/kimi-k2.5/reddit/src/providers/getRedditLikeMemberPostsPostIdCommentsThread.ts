import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeCommentAtThreadTransformer } from "../transformers/RedditLikeCommentAtThreadTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberPostsPostIdCommentsThread(props: {
  member: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeComment.IThread[]> {
  // Verify post exists - will throw 404 if not found
  await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  // Fetch all top-level comments for this post with nested replies
  const comments = await MyGlobal.prisma.reddit_like_comments.findMany({
    where: {
      post_id: props.postId,
      parent_id: null,
    },
    orderBy: {
      created_at: "desc",
    },
    ...RedditLikeCommentAtThreadTransformer.select(),
  });
  // Transform to hierarchical thread structure
  return await ArrayUtil.asyncMap(
    comments,
    RedditLikeCommentAtThreadTransformer.transform,
  );
}
