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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalBoardArticleTransformer } from "../transformers/EconomicPoliticalBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomicPoliticalBoardAdminArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardArticle.IUpdate;
}): Promise<IEconomicPoliticalBoardArticle> {
  // 1. Verify article exists
  const article =
    await MyGlobal.prisma.economic_political_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true, author_id: true },
    });
  // 2. Verify admin is the article's author
  if (article.author_id !== props.admin.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate tags if provided
  const tagIds: string[] = [];
  if (props.body.tags !== undefined) {
    for (const tagName of props.body.tags) {
      const tag =
        await MyGlobal.prisma.economic_political_board_tags.findUnique({
          where: { name: tagName },
        });
      if (tag === null) {
        throw new HttpException(`Tag not found: ${tagName}`, 400);
      }
      tagIds.push(tag.id);
    }
  }
  // 4. Begin transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // 5. Prepare update data
    const updateData: Prisma.economic_political_board_articlesUpdateInput = {};
    if (props.body.title !== undefined) {
      updateData.title = props.body.title;
    }
    if (props.body.content !== undefined) {
      updateData.content = props.body.content;
    }
    updateData.updated_at = new Date();
    // 6. Handle tags - delete existing, create new
    await tx.economic_political_board_article_tags.deleteMany({
      where: { article_id: props.articleId },
    });
    if (tagIds.length > 0) {
      await tx.economic_political_board_article_tags.createMany({
        data: tagIds.map((tagId) => ({
          id: v4(),
          article_id: props.articleId,
          tag_id: tagId,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      });
    }
    // 7. Handle attachments - process operations array
    if (props.body.attachments !== undefined) {
      // attachments is an array of IManage objects, each with operations array
      for (const manage of props.body.attachments) {
        // Process each operation in the operations array
        for (const op of manage.operations) {
          if (op.action === "add") {
            const addOp =
              op as IEconomicPoliticalBoardAttachment.IManageOperation & {
                fileUrl: string;
                fileName: string;
                fileType: "image" | "file";
              };
            await tx.economic_political_board_attachments.create({
              data: {
                id: v4(),
                article_id: props.articleId,
                file_url: addOp.fileUrl,
                file_name: addOp.fileName,
                file_type: addOp.fileType,
                created_at: new Date(),
                updated_at: new Date(),
              },
            });
          } else if (op.action === "remove") {
            const removeOp =
              op as IEconomicPoliticalBoardAttachment.IManageOperation & {
                attachmentId: string;
              };
            await tx.economic_political_board_attachments.deleteMany({
              where: { id: removeOp.attachmentId },
            });
          }
        }
      }
    }
    // 8. Update the article
    const updated = await tx.economic_political_board_articles.update({
      where: { id: props.articleId },
      data: updateData,
      ...EconomicPoliticalBoardArticleTransformer.select(),
    });
    return updated;
  });
  // 9. Transform and return
  return await EconomicPoliticalBoardArticleTransformer.transform(result);
}
