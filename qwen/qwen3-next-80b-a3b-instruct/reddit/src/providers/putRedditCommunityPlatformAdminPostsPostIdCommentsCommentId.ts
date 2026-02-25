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
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { RedditCommunityCommentTransformer } from "../transformers/RedditCommunityCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityPlatformAdminPostsPostIdCommentsCommentId(props: {
  platformAdmin: PlatformadminPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IUpdate;
}): Promise<IRedditCommunityComment> {
  // Fetch the full comment to validate and return later
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
      },
      select: {
        id: true,
        content: true,
        vote_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post_id: true,
        author_id: true,
      },
    });
  // Reject if comment is deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment is archived and cannot be updated", 403);
  }
  // Validate content length per DTO specification (1-2000 chars)
  if (props.body.content.length < 1 || props.body.content.length > 2000) {
    throw new HttpException(
      "Comment content must be between 1 and 2000 characters",
      400,
    );
  }
  // Update comment content and timestamp
  await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
      updated_at: new Date().toISOString(),
    },
  });
  // Fetch the full updated comment with relations
  const updated =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...RedditCommunityCommentTransformer.select(),
    });
  // Return full comment using transformer
  return await RedditCommunityCommentTransformer.transform(updated);
}
