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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "../transformers/DiscussionBoardMemberAtSummaryTransformer";
import { DiscussionBoardSectionAtSummaryTransformer } from "../transformers/DiscussionBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  // Fetch existing article with all needed data
  const existing =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: {
        id: true,
        title: true,
        content: true,
        section_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author_id: true,
        author: DiscussionBoardMemberAtSummaryTransformer.select(),
        section: DiscussionBoardSectionAtSummaryTransformer.select(),
        comments: { select: { id: true } },
        files: { select: { file_path: true, original_filename: true } },
        images: { select: { stored_path: true, original_filename: true } },
        tags: {
          select: {
            tag: { select: { tag_name: true } },
          },
        },
      },
    });
  // Authorization check: only author or admin can update
  const isAuthorized =
    existing.author_id === props.member.id ||
    (props.member as any).is_admin === true ||
    (props.member as any).is_super_admin === true;
  if (!isAuthorized) {
    throw new HttpException("Forbidden", 403);
  }
  // Update article fields
  const updated = await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: {
      title: props.body.title ?? existing.title,
      content: props.body.content ?? existing.content,
      section_id: props.body.section_id ?? existing.section_id,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
  // Handle tag replacement if tags are provided
  if (props.body.tags !== undefined) {
    // Delete existing tag associations
    await MyGlobal.prisma.discussion_board_article_tags.deleteMany({
      where: { article_id: props.articleId },
    });
    // Create new tag associations
    for (const tagName of props.body.tags) {
      // Find or create tag
      let tag = await MyGlobal.prisma.discussion_board_tags.findUnique({
        where: { tag_name: tagName },
      });
      if (!tag) {
        tag = await MyGlobal.prisma.discussion_board_tags.create({
          data: {
            tag_name: tagName,
            created_at: new Date().toISOString() as string &
              tags.Format<"date-time">,
            id: v4(),
          },
        });
      }
      // Create association with id field
      await MyGlobal.prisma.discussion_board_article_tags.create({
        data: {
          id: v4(),
          article_id: props.articleId,
          tag_name: tag.tag_name,
        },
      });
    }
  }
  // Transform and return
  return await DiscussionBoardArticleTransformer.transform({
    id: updated.id,
    title: updated.title,
    content: updated.content,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    deleted_at: updated.deleted_at,
    author: existing.author,
    section: existing.section,
    comments: existing.comments,
    files: existing.files,
    images: existing.images,
    tags: existing.tags,
  });
}
