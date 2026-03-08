import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  // Fetch article and verify ownership
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: {
        id: props.articleId,
        deleted_at: null,
      },
      select: {
        id: true,
        member_id: true,
      },
    });
  // Check ownership - only author can edit
  if (article.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify member is not banned
  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: props.member.id },
      select: { banned: true },
    });
  if (member.banned) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate section if provided
  if (props.body.section_id !== undefined) {
    const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
      where: { id: props.body.section_id },
    });
    if (!section) {
      throw new HttpException("Section not found", 400);
    }
  }
  // Update article and handle tags atomically
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update article fields
    await tx.discussion_board_articles.update({
      where: { id: props.articleId },
      data: {
        ...(props.body.title !== undefined && { title: props.body.title }),
        ...(props.body.content !== undefined && {
          content: props.body.content,
        }),
        ...(props.body.section_id !== undefined && {
          section_id: props.body.section_id,
        }),
        updated_at: new Date(),
      },
    });
    // Handle tags if provided
    if (props.body.tags !== undefined) {
      // Delete existing tag associations
      await tx.discussion_board_article_tags.deleteMany({
        where: { discussion_board_article_id: props.articleId },
      });
      // Create new tag associations
      for (const tagName of props.body.tags) {
        const trimmedName = tagName.trim();
        if (trimmedName.length === 0) continue;
        // Find or create tag
        let tag = await tx.discussion_board_tags.findUnique({
          where: { name: trimmedName },
        });
        if (!tag) {
          tag = await tx.discussion_board_tags.create({
            data: {
              id: v4(),
              name: trimmedName,
              created_at: new Date(),
              updated_at: new Date(),
              deleted_at: null,
            },
          });
        }
        // Create junction record
        await tx.discussion_board_article_tags.create({
          data: {
            id: v4(),
            discussion_board_article_id: props.articleId,
            discussion_board_tag_id: tag.id,
            created_at: new Date(),
          },
        });
      }
    }
  });
  // Fetch and return updated article with all relationships
  const updated =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      ...DiscussionBoardArticleTransformer.select(),
    });
  return await DiscussionBoardArticleTransformer.transform(updated);
}
