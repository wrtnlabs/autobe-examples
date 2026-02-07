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

export async function putDiscussionBoardSuperAdminArticlesArticleIdCommentsCommentIdFlagsFlagId(props: {
  superAdmin: SuperadminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  flagId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentFlag.IUpdate;
}): Promise<IDiscussionBoardCommentFlag> {
  // First verify the flag exists and belongs to the specified comment and article
  const flag = await MyGlobal.prisma.discussion_board_comment_flags.findFirst({
    where: {
      id: props.flagId,
      comment_id: props.commentId,
      comment: {
        article: {
          id: props.articleId,
        },
      },
    },
  });
  if (!flag) {
    throw new HttpException("Comment flag not found", 404);
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_comment_flagsUpdateInput = {
    flag_reason: props.body.flag_reason,
    flag_type: props.body.flag_type,
  };
  // Update status if provided
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
    // Update reviewed_at if status changes to under_review
    if (
      props.body.status === "under_review" &&
      flag.status !== "under_review"
    ) {
      updateData.reviewed_at = new Date();
      updateData.reviewer = {
        connect: {
          id: props.superAdmin.id,
        },
      };
    }
    // Update resolved_at if status changes to resolved/dismissed
    if (
      (props.body.status === "resolved" || props.body.status === "dismissed") &&
      flag.status !== "resolved" &&
      flag.status !== "dismissed"
    ) {
      updateData.resolved_at = new Date();
    }
  }
  // Update resolution_notes if provided
  if (props.body.resolution_notes !== undefined) {
    updateData.resolution_notes = props.body.resolution_notes;
  }
  // Perform the update
  const updatedFlag =
    await MyGlobal.prisma.discussion_board_comment_flags.update({
      where: { id: props.flagId },
      data: updateData,
      ...DiscussionBoardCommentFlagTransformer.select(),
    });
  return await DiscussionBoardCommentFlagTransformer.transform(updatedFlag);
}
