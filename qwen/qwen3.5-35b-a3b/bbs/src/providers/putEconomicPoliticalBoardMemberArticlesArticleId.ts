import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EconomicPoliticalBoardArticleTransformer } from "../transformers/EconomicPoliticalBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomicPoliticalBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardArticle.IUpdate;
}): Promise<IEconomicPoliticalBoardArticle> {
  // Find the article with author info
  const article =
    await MyGlobal.prisma.economic_political_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      include: {
        author: true,
        section: true,
      },
    });
  // Check soft delete
  if (article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  // Verify ownership
  if (article.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate section if provided
  if (props.body.section_id !== undefined) {
    const section =
      await MyGlobal.prisma.economic_political_board_sections.findFirst({
        where: { id: props.body.section_id },
      });
    if (section === null) {
      throw new HttpException("Section not found", 404);
    }
  }
  // Build update data
  const updateData: {
    title?: string | undefined;
    content?: string | undefined;
    section_id?: (string & tags.Format<"uuid">) | undefined;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.content !== undefined) {
    updateData.content = props.body.content;
  }
  if (props.body.section_id !== undefined) {
    updateData.section_id = props.body.section_id;
  }
  // Update the article
  await MyGlobal.prisma.economic_political_board_articles.update({
    where: { id: props.articleId },
    data: updateData,
  });
  // Process tags if provided
  if (props.body.tags !== undefined) {
    // Delete old tag associations
    await MyGlobal.prisma.economic_political_board_article_tags.deleteMany({
      where: { article_id: props.articleId },
    });
    // Create new tag associations
    if (props.body.tags.length > 0) {
      await MyGlobal.prisma.economic_political_board_article_tags.createMany({
        data: props.body.tags.map((tag) => ({
          id: v4(),
          article_id: props.articleId,
          tag_id: tag.id,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      });
    }
  }
  // Fetch updated article with tags
  const finalArticle =
    await MyGlobal.prisma.economic_political_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      ...EconomicPoliticalBoardArticleTransformer.select(),
    });
  return await EconomicPoliticalBoardArticleTransformer.transform(finalArticle);
}
