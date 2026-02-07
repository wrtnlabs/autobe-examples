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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardCommentModerationTransformer } from "../transformers/DiscussionBoardCommentModerationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminArticlesArticleIdCommentsCommentIdModerationsModerationId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  moderationId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentModeration> {
  const moderation =
    await MyGlobal.prisma.discussion_board_comment_moderations.findFirst({
      where: {
        id: props.moderationId,
        discussion_board_comment_id: props.commentId,
        comment: {
          discussion_board_article_id: props.articleId,
        },
      },
      ...DiscussionBoardCommentModerationTransformer.select(),
    });
  if (!moderation) {
    throw new HttpException(
      "Moderation record not found or does not belong to the specified comment and article",
      404,
    );
  }
  return await DiscussionBoardCommentModerationTransformer.transform(
    moderation,
  );
}
