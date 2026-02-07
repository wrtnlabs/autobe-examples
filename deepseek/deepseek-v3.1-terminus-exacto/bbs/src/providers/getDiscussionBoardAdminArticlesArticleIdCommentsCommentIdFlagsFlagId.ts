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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardCommentFlagTransformer } from "../transformers/DiscussionBoardCommentFlagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminArticlesArticleIdCommentsCommentIdFlagsFlagId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  flagId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentFlag> {
  // First validate that the comment exists and belongs to the article
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: {
      id: props.commentId,
      discussion_board_article_id: props.articleId,
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Then retrieve the specific flag with all relations
  const flag = await MyGlobal.prisma.discussion_board_comment_flags.findUnique({
    where: {
      id: props.flagId,
      comment_id: props.commentId,
    },
    ...DiscussionBoardCommentFlagTransformer.select(),
  });
  if (!flag) {
    throw new HttpException("Flag not found", 404);
  }
  return await DiscussionBoardCommentFlagTransformer.transform(flag);
}
