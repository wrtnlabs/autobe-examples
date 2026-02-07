import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentModerationCollector } from "../collectors/DiscussionBoardCommentModerationCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardCommentModerationTransformer } from "../transformers/DiscussionBoardCommentModerationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminArticlesArticleIdCommentsCommentIdModerations(props: {
  superAdmin: SuperadminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentModeration.ICreate;
}): Promise<IDiscussionBoardCommentModeration> {
  // Validate that the comment exists and belongs to the specified article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: {
      id: props.commentId,
      discussion_board_article_id: props.articleId,
    },
  });
  if (!comment) {
    throw new HttpException(
      "Comment not found or does not belong to the specified article",
      404,
    );
  }
  // Validate that the super admin exists and is active
  const superAdmin =
    await MyGlobal.prisma.discussion_board_super_admins.findUnique({
      where: { id: props.superAdmin.id, deleted_at: null },
    });
  if (!superAdmin) {
    throw new HttpException("Super administrator not found", 404);
  }
  // Create the moderation record using collector with proper entity structure
  const created =
    await MyGlobal.prisma.discussion_board_comment_moderations.create({
      data: await DiscussionBoardCommentModerationCollector.collect({
        body: props.body,
        discussionBoardComments: { id: props.commentId } as IEntity,
        discussionBoardAdmins: { id: props.superAdmin.id } as IEntity,
        discussionBoardAdminSessions: {
          id: props.superAdmin.session_id,
        } as IEntity,
      }),
      ...DiscussionBoardCommentModerationTransformer.select(),
    });
  // Transform and return the result
  return await DiscussionBoardCommentModerationTransformer.transform(created);
}
