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
import { EconomicPoliticalBoardAttachmentAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardAttachmentAtSummaryTransformer";
import { EconomicPoliticalBoardMemberAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardMemberAtSummaryTransformer";
import { EconomicPoliticalBoardSectionAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardSectionAtSummaryTransformer";
import { EconomicPoliticalBoardTagAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardTagAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomicPoliticalBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardArticle.IUpdate;
}): Promise<IEconomicPoliticalBoardArticle> {
  const article =
    await MyGlobal.prisma.economic_political_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: {
        id: true,
        author_id: true,
        section_id: true,
        title: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: EconomicPoliticalBoardMemberAtSummaryTransformer.select(),
        section: EconomicPoliticalBoardSectionAtSummaryTransformer.select(),
        attachments:
          EconomicPoliticalBoardAttachmentAtSummaryTransformer.select(),
        articleTags: {
          select: {
            tag: EconomicPoliticalBoardTagAtSummaryTransformer.select(),
          },
        } satisfies Prisma.economic_political_board_article_tagsFindManyArgs,
        comments: { select: { deleted_at: true } },
      },
    });
  if (article.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updateData: Prisma.economic_political_board_articlesUpdateInput = {};
  if (props.body.title !== undefined) updateData.title = props.body.title;
  if (props.body.content !== undefined) updateData.content = props.body.content;
  if (props.body.tags !== undefined) {
    const tagResults =
      await MyGlobal.prisma.economic_political_board_tags.findMany({
        where: {
          name: { in: props.body.tags },
        },
        select: { id: true, name: true },
      });
    const tagMap = new Map(tagResults.map((t) => [t.name, t.id]));
    const missingTags = props.body.tags.filter((name) => !tagMap.has(name));
    if (missingTags.length > 0) {
      throw new HttpException(`Tag not found: ${missingTags[0]}`, 400);
    }
    await MyGlobal.prisma.economic_political_board_article_tags.deleteMany({
      where: { article_id: props.articleId },
    });
    if (props.body.tags.length > 0) {
      await MyGlobal.prisma.economic_political_board_article_tags.createMany({
        data: props.body.tags.map((tagName) => ({
          id: v4() as string & tags.Format<"uuid">,
          article_id: props.articleId,
          tag_id: tagMap.get(tagName)!,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        })),
      });
    }
  }
  if (props.body.attachments !== undefined) {
    const attachmentsToDelete = new Set<string>();
    const attachmentsToCreate: Prisma.economic_political_board_attachmentsCreateManyInput[] =
      [];
    const operations = props.body.attachments.operations;
    for (const op of operations) {
      const action = op.action as string;
      if (action === "remove" && op.attachmentId) {
        attachmentsToDelete.add(op.attachmentId);
      } else if (action === "add" && op.fileUrl && op.fileName && op.fileType) {
        attachmentsToCreate.push({
          id: v4() as string & tags.Format<"uuid">,
          article_id: props.articleId,
          file_url: op.fileUrl,
          file_name: op.fileName,
          file_type: op.fileType,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        });
      }
    }
    if (attachmentsToDelete.size > 0) {
      await MyGlobal.prisma.economic_political_board_attachments.deleteMany({
        where: {
          article_id: props.articleId,
          id: { in: Array.from(attachmentsToDelete) },
        },
      });
    }
    if (attachmentsToCreate.length > 0) {
      await MyGlobal.prisma.economic_political_board_attachments.createMany({
        data: attachmentsToCreate,
      });
    }
  }
  updateData.updated_at = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.economic_political_board_articles.update({
      where: { id: props.articleId },
      data: updateData,
      ...EconomicPoliticalBoardArticleTransformer.select(),
    });
  return await EconomicPoliticalBoardArticleTransformer.transform(updated);
}
