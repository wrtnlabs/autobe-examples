import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumComment";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function deletePoliticalForumCitizenPostsPostIdCommentsCommentId(props: {
  citizen: CitizenPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IPoliticalForumComment> {
  const comment = await MyGlobal.prisma.political_forum_comments.findUnique({
    where: {
      id: props.commentId,
      post_id: props.postId,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Verify ownership: citizen must be author of comment or have moderator privileges
  if (comment.citizen_id !== props.citizen.id) {
    // Check if citizen has moderator privileges (proxy via presence in political_forum_moderators)
    const isModerator =
      await MyGlobal.prisma.political_forum_moderators.findUnique({
        where: {
          id: props.citizen.id,
        },
      });

    if (!isModerator) {
      throw new HttpException("Forbidden", 403);
    }
  }

  // Perform hard delete
  await MyGlobal.prisma.political_forum_comments.delete({
    where: {
      id: props.commentId,
    },
  });

  // Return the commentId as string, which matches the IPoliticalForumComment type definition
  return props.commentId;
}
