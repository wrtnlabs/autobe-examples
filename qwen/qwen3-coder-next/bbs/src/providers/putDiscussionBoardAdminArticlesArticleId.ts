import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminArticlesArticleId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  // Find the existing article
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true, author_id: true, deleted_at: true },
    });
  // Authorization: author can update their own article, admin can update any
  const isAdmin =
    props.admin.type === "admin" || props.admin.type === "super_admin";
  const isAuthor = article.author_id === props.admin.id;
  if (!isAuthor && !isAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft deleted articles cannot be updated
  if (article.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Optional section_id validation
  if (props.body.section_id !== undefined) {
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.body.section_id },
    });
  }
  // Optional tag update (full replacement)
  let tagUpdate: {} | undefined = undefined;
  if (props.body.tags !== undefined) {
    // Delete existing tag associations
    await MyGlobal.prisma.discussion_board_article_tags.deleteMany({
      where: { article_id: props.articleId },
    });
    // Create new tag associations (create tags first if not exist)
    const tagNames = props.body.tags.filter((name) => name.trim() !== "");
    if (tagNames.length > 0) {
      const tagRecords = await Promise.all(
        tagNames.map(async (name) => {
          name = name.trim();
          return MyGlobal.prisma.discussion_board_tags.upsert({
            where: { tag_name: name },
            update: {},
            create: { id: v4(), tag_name: name, created_at: new Date() },
          });
        }),
      );
      tagUpdate = {
        tags: {
          create: tagRecords.map((tag) => ({
            id: v4(),
            article_id: props.articleId,
            tag_id: tag.id,
            created_at: toISOStringSafe(tag.created_at),
          })),
        },
      };
    }
  }
  // Build update data
  const updateData: Prisma.discussion_board_articlesUpdateInput = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.content !== undefined && { content: props.body.content }),
    ...(props.body.section_id !== undefined && {
      section_id: props.body.section_id,
    }),
    updated_at: new Date(),
    ...tagUpdate,
  };
  // Update the article
  const updated = await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: updateData,
    ...DiscussionBoardArticleTransformer.select(),
  });
  return await DiscussionBoardArticleTransformer.transform(updated);
}
