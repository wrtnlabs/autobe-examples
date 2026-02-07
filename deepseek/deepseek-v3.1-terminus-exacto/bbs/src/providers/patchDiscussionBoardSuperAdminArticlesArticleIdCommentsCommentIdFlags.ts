import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardCommentFlagTransformer } from "../transformers/DiscussionBoardCommentFlagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminArticlesArticleIdCommentsCommentIdFlags(props: {
  superAdmin: SuperadminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentFlag.IUpdate;
}): Promise<IDiscussionBoardCommentFlag> {
  // Validate that comment exists and belongs to the specified article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true, article: { select: { id: true } } },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.article.id !== props.articleId) {
    throw new HttpException(
      "Comment does not belong to the specified article",
      400,
    );
  }
  // Find the comment flag for this comment
  const existingFlag =
    await MyGlobal.prisma.discussion_board_comment_flags.findFirst({
      where: { comment_id: props.commentId },
      ...DiscussionBoardCommentFlagTransformer.select(),
    });
  if (!existingFlag) {
    throw new HttpException("Comment flag not found", 404);
  }
  // Prepare update data
  const currentTime = toISOStringSafe(new Date());
  const statusChanged =
    props.body.status && props.body.status !== existingFlag.status;
  const becameResolved = props.body.status === "resolved";
  const updateData: Prisma.discussion_board_comment_flagsUpdateInput = {
    flag_reason: props.body.flag_reason,
    flag_type: props.body.flag_type,
    reviewer: { connect: { id: props.superAdmin.id } },
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.resolution_notes !== undefined && {
      resolution_notes: props.body.resolution_notes,
    }),
    ...(statusChanged && { reviewed_at: currentTime }),
    ...(becameResolved && { resolved_at: currentTime }),
  };
  // Update the flag
  const updatedFlag =
    await MyGlobal.prisma.discussion_board_comment_flags.update({
      where: { id: existingFlag.id },
      data: updateData,
      ...DiscussionBoardCommentFlagTransformer.select(),
    });
  return await DiscussionBoardCommentFlagTransformer.transform(updatedFlag);
}
