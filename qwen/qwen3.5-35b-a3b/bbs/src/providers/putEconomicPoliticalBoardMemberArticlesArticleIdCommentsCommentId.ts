import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EconomicPoliticalBoardCommentTransformer } from "../transformers/EconomicPoliticalBoardCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomicPoliticalBoardMemberArticlesArticleIdCommentsCommentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardComment.IUpdate;
}): Promise<IEconomicPoliticalBoardComment> {
  // 1. Verify comment exists (includes article_id validation)
  const comment =
    await MyGlobal.prisma.economic_political_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
    });
  // 2. Validate comment belongs to specified article
  if (comment.article_id !== props.articleId) {
    throw new HttpException("Comment does not belong to this article", 404);
  }
  // 3. Validate comment ownership - member must own the comment
  if (comment.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Validate content is provided and not empty (1-10000 chars per DTO)
  const content = props.body.content;
  if (content === undefined || content.length < 1 || content.length > 10000) {
    throw new HttpException(
      "Content must be between 1 and 10000 characters",
      400,
    );
  }
  // 5. Update comment with new content and updated_at timestamp
  await MyGlobal.prisma.economic_political_board_comments.update({
    where: { id: props.commentId },
    data: {
      content,
      updated_at: new Date(),
    },
  });
  // 6. Re-fetch with full joins using transformer
  const updated =
    await MyGlobal.prisma.economic_political_board_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...EconomicPoliticalBoardCommentTransformer.select(),
    });
  // 7. Transform and return
  return await EconomicPoliticalBoardCommentTransformer.transform(updated);
}
