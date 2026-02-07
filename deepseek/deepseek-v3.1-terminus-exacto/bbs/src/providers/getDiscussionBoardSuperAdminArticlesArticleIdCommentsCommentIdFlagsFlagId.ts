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

export async function getDiscussionBoardSuperAdminArticlesArticleIdCommentsCommentIdFlagsFlagId(props: {
  superAdmin: SuperadminPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  flagId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentFlag> {
  // Validate the hierarchical relationship: article → comment → flag
  const flag = await MyGlobal.prisma.discussion_board_comment_flags.findUnique({
    where: {
      id: props.flagId,
      comment: {
        id: props.commentId,
        article: { id: props.articleId },
      },
    },
    ...DiscussionBoardCommentFlagTransformer.select(),
  });
  if (!flag) {
    throw new HttpException(
      "Flag not found or does not belong to the specified comment and article",
      404,
    );
  }
  return await DiscussionBoardCommentFlagTransformer.transform(flag);
}
