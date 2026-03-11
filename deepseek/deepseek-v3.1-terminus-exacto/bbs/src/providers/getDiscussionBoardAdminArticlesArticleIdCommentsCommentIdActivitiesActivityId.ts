import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentActivity";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardCommentActivityTransformer } from "../transformers/DiscussionBoardCommentActivityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getDiscussionBoardAdminArticlesArticleIdCommentsCommentIdActivitiesActivityId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  activityId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentActivity> {
  // Verify comment exists and belongs to the correct article
  const comment =
    await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        discussion_board_article_id: props.articleId,
      },
      select: { id: true },
    });
  // Retrieve the activity with full transformer select, ensuring it belongs to the comment
  const activity =
    await MyGlobal.prisma.discussion_board_comment_activities.findUniqueOrThrow(
      {
        where: {
          id: props.activityId,
          comment_id: props.commentId,
        },
        ...DiscussionBoardCommentActivityTransformer.select(),
      },
    );
  return await DiscussionBoardCommentActivityTransformer.transform(activity);
}
