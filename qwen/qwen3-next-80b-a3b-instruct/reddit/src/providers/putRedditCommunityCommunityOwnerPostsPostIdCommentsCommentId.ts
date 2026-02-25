import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { RedditCommunityCommentTransformer } from "../transformers/RedditCommunityCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityCommunityOwnerPostsPostIdCommentsCommentId(props: {
  communityOwner: CommunityownerPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IUpdate;
}): Promise<IRedditCommunityComment> {
  // Verify post exists and is not locked
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { is_locked: true } as any,
  });
  if (post.is_locked) {
    throw new HttpException("Cannot edit comments on locked posts", 403);
  }
  // Verify comment exists and belongs to user
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { author_id: true, deleted_at: true },
    });
  if (comment.deleted_at !== null) {
    throw new HttpException("Cannot edit deleted comments", 403);
  }
  if (comment.author_id !== props.communityOwner.id) {
    throw new HttpException(
      "Forbidden: You can only edit your own comments",
      403,
    );
  }
  // Update comment content and timestamp
  const updated = await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Re-fetch with transformer to ensure type-safe response
  const fullComment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...RedditCommunityCommentTransformer.select(),
    });
  return await RedditCommunityCommentTransformer.transform(fullComment);
}
