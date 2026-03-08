import { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
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
  // Verify article exists
  await MyGlobal.prisma.economic_political_board_articles.findUniqueOrThrow({
    where: { id: props.articleId, deleted_at: null },
  });
  // Find comment and verify ownership in single query
  const comment =
    await MyGlobal.prisma.economic_political_board_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        article_id: props.articleId,
        author_id: props.member.id,
      },
      ...EconomicPoliticalBoardCommentTransformer.select(),
    });
  // Check if user is banned
  const banRecord =
    await MyGlobal.prisma.economic_political_board_ban_records.findFirst({
      where: { user_id: props.member.id },
    });
  if (banRecord !== null) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify edit window (60 minutes from creation)
  const createdAt = new Date(comment.created_at);
  const now = new Date();
  const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
  if (diffMinutes > 60) {
    throw new HttpException("Edit window expired", 409);
  }
  // Validate content
  if (
    props.body.content === undefined ||
    props.body.content === null ||
    props.body.content.trim().length === 0
  ) {
    throw new HttpException("Content cannot be empty", 400);
  }
  if (props.body.content.length > 10000) {
    throw new HttpException("Content too long", 400);
  }
  // Update comment
  const updated =
    await MyGlobal.prisma.economic_political_board_comments.update({
      where: { id: props.commentId },
      data: {
        content: props.body.content,
        updated_at: new Date(),
      },
      ...EconomicPoliticalBoardCommentTransformer.select(),
    });
  return await EconomicPoliticalBoardCommentTransformer.transform(updated);
}
