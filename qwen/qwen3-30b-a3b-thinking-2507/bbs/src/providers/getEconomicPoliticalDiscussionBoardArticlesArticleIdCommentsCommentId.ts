import { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import { IEconomicPoliticalDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardComment";
import { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalDiscussionBoardArticleAtSummaryTransformer } from "../transformers/EconomicPoliticalDiscussionBoardArticleAtSummaryTransformer";
import { EconomicPoliticalDiscussionBoardCommentTransformer } from "../transformers/EconomicPoliticalDiscussionBoardCommentTransformer";
import { EconomicPoliticalDiscussionBoardUserAtSummaryTransformer } from "../transformers/EconomicPoliticalDiscussionBoardUserAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicPoliticalDiscussionBoardArticlesArticleIdCommentsCommentId(props: {
  articleId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalDiscussionBoardComment> {
  const comment =
    await MyGlobal.prisma.economic_political_discussion_board_comments.findUniqueOrThrow(
      {
        where: { id: props.commentId },
        select: {
          id: true,
          content: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          article:
            EconomicPoliticalDiscussionBoardArticleAtSummaryTransformer.select(),
          user: EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.select(),
        },
      },
    );
  if (comment.deleted_at) {
    throw new HttpException("Comment not found", 404);
  }
  return await EconomicPoliticalDiscussionBoardCommentTransformer.transform(
    comment,
  );
}
