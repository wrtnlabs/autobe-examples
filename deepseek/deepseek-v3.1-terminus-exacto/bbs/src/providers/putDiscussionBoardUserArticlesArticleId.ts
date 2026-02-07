import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardUserArticlesArticleId(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  // Validate article exists and belongs to user
  const existingArticle =
    await MyGlobal.prisma.discussion_board_articles.findFirst({
      where: {
        id: props.articleId,
        discussion_board_user_id: props.user.id,
        deleted_at: null,
      },
    });
  if (!existingArticle) {
    throw new HttpException(
      "Article not found or you don't have permission to update it",
      404,
    );
  }
  // Validate section exists and is active if section_id is provided
  if (props.body.discussion_board_section_id) {
    const section = await MyGlobal.prisma.discussion_board_sections.findFirst({
      where: {
        id: props.body.discussion_board_section_id,
        status: "active",
        deleted_at: null,
      },
    });
    if (!section) {
      throw new HttpException("Target section not found or is not active", 400);
    }
  }
  // Prepare update data
  const updateData: Prisma.discussion_board_articlesUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.content !== undefined) {
    updateData.content = props.body.content;
  }
  if (props.body.discussion_board_section_id !== undefined) {
    updateData.section = {
      connect: { id: props.body.discussion_board_section_id },
    };
  }
  // Update the article
  const updatedArticle = await MyGlobal.prisma.discussion_board_articles.update(
    {
      where: { id: props.articleId },
      data: updateData,
      ...DiscussionBoardArticleTransformer.select(),
    },
  );
  return await DiscussionBoardArticleTransformer.transform(updatedArticle);
}
