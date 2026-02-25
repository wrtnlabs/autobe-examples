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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminArticlesArticleId(props: {
  superAdmin: SuperadminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  // 1. Verify article exists
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { author_id: true, section_id: true, title: true, content: true },
    });
  // 2. Validate section_id if provided
  if (
    props.body.section_id !== undefined &&
    props.body.section_id !== article.section_id
  ) {
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.body.section_id },
    });
  }
  // 3. Build updated data
  const updatedData: Prisma.discussion_board_articlesUpdateInput = {
    ...(props.body.title !== undefined && {
      title: props.body.title,
    }),
    ...(props.body.content !== undefined && {
      content: props.body.content,
    }),
    updated_at: new Date().toISOString(),
  };
  // 4. Update section_id if provided
  if (props.body.section_id !== undefined) {
    updatedData.section = {
      connect: { id: props.body.section_id },
    };
  }
  // 5. Update tags if provided
  if (props.body.tags !== undefined) {
    // Get existing tag associations
    const existingTagNames =
      await MyGlobal.prisma.discussion_board_article_tags.findMany({
        where: { article_id: props.articleId },
        select: { tag_name: true },
      });
    const existingTagSet = new Set(
      existingTagNames.map((item) => item.tag_name),
    );
    const newTagSet = new Set(props.body.tags);
    // Find tags to add
    const tagsToAdd = props.body.tags.filter((tag) => !existingTagSet.has(tag));
    // Find tags to remove
    const tagsToRemove = Array.from(existingTagSet).filter(
      (tag) => !newTagSet.has(tag),
    );
    // Add new tags
    for (const tag of tagsToAdd) {
      // Find or create tag
      let tagRecord = await MyGlobal.prisma.discussion_board_tags.findUnique({
        where: { tag_name: tag },
      });
      if (!tagRecord) {
        tagRecord = await MyGlobal.prisma.discussion_board_tags.create({
          data: {
            id: v4(),
            tag_name: tag,
            created_at: new Date().toISOString(),
          },
        });
      }
      // Create association with article_id and tag_name
      await MyGlobal.prisma.discussion_board_article_tags.create({
        data: {
          id: v4(),
          article_id: props.articleId,
          tag_name: tag,
        },
      });
    }
    // Remove old tags
    await MyGlobal.prisma.discussion_board_article_tags.deleteMany({
      where: {
        article_id: props.articleId,
        tag_name: {
          in: tagsToRemove,
        },
      },
    });
  }
  // 6. Update article
  const updatedArticle = await MyGlobal.prisma.discussion_board_articles.update(
    {
      where: { id: props.articleId },
      data: updatedData,
      ...DiscussionBoardArticleTransformer.select(),
    },
  );
  // 7. Return transformed result
  return await DiscussionBoardArticleTransformer.transform(updatedArticle);
}
