import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommentTransformer } from "../transformers/RedditCloneCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.IUpdate;
}): Promise<IRedditCloneComment> {
  // 1. Find the comment by ID
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      reddit_clone_member_id: true,
      deleted_at: true,
    },
  });
  // 2. Check if comment exists
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  // 3. Check if comment is soft-deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  // 4. Authorization check - only author can edit
  if (comment.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("You can only edit your own comments", 403);
  }
  // 5. Update the comment content and timestamp
  await MyGlobal.prisma.reddit_clone_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
      updated_at: new Date(),
    },
  });
  // 6. Fetch the updated comment with all relations for response
  const updated = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      ...RedditCloneCommentTransformer.select(),
    },
  );
  // 7. Transform and return
  return await RedditCloneCommentTransformer.transform(updated);
}
