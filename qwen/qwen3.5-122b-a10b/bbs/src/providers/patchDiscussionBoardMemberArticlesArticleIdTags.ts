import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTagSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagSummary";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberArticlesArticleIdTags(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.ITag;
}): Promise<IDiscussionBoardArticleTagSummary[]> {
  // 1. Verify article exists and member is owner
  const article =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { discussion_board_member_id: true, deleted_at: true },
    });
  if (article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }
  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Validate tags
  const tagsInput = props.body.tags;
  if (tagsInput.length === 0) {
    throw new HttpException("At least one tag required", 400);
  }
  if (tagsInput.length > 20) {
    throw new HttpException("Maximum 20 tags allowed", 409);
  }
  // Check for empty strings and length
  for (const tag of tagsInput) {
    if (tag.trim().length === 0) {
      throw new HttpException("Tag name cannot be empty", 400);
    }
    if (tag.length > 50) {
      throw new HttpException("Tag name too long (max 50 characters)", 400);
    }
  }
  // Check for duplicates (case-insensitive)
  const lowercasedTags = tagsInput.map((t) => t.toLowerCase());
  const uniqueTags = new Set(lowercasedTags);
  if (uniqueTags.size !== tagsInput.length) {
    throw new HttpException("Duplicate tags not allowed", 400);
  }
  // 3. Resolve or create tags within transaction
  const resolvedTags = await MyGlobal.prisma.$transaction(async (tx) => {
    const results: Array<{
      name: string;
      id: string & tags.Format<"uuid">;
    }> = [];
    for (const tagName of tagsInput) {
      // Try to find existing tag (case-insensitive)
      const existing = await tx.discussion_board_tags.findFirst({
        where: {
          name: {
            equals: tagName,
            mode: "insensitive",
          },
          deleted_at: null,
        },
      });
      if (existing) {
        results.push({
          name: tagName,
          id: existing.id,
        });
      } else {
        // Create new tag
        const now = new Date();
        const newTag = await tx.discussion_board_tags.create({
          data: {
            id: v4(),
            name: tagName,
            description: null,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
        });
        results.push({
          name: tagName,
          id: newTag.id,
        });
      }
    }
    return results;
  });
  // 4. Manage associations within transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Get existing associations
    const existingAssociations =
      await tx.discussion_board_article_tags.findMany({
        where: {
          discussion_board_article_id: props.articleId,
          deleted_at: null,
        },
        select: { id: true, discussion_board_tag_id: true },
      });
    const existingTagIds = new Set(
      existingAssociations.map((a) => a.discussion_board_tag_id),
    );
    const requestedTagIds = new Set(resolvedTags.map((t) => t.id));
    // Soft-delete associations that are no longer requested
    const toDelete = existingAssociations.filter(
      (a) => !requestedTagIds.has(a.discussion_board_tag_id),
    );
    if (toDelete.length > 0) {
      await tx.discussion_board_article_tags.updateMany({
        where: {
          id: { in: toDelete.map((a) => a.id) },
        },
        data: {
          deleted_at: new Date(),
          updated_at: new Date(),
        },
      });
    }
    // Create new associations for tags that weren't there
    const toCreate = resolvedTags.filter((t) => !existingTagIds.has(t.id));
    if (toCreate.length > 0) {
      const now = new Date();
      await tx.discussion_board_article_tags.createMany({
        data: toCreate.map((t) => ({
          id: v4(),
          discussion_board_article_id: props.articleId,
          discussion_board_tag_id: t.id,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })),
      });
    }
  });
  // 5. Return updated associations
  const finalAssociations =
    await MyGlobal.prisma.discussion_board_article_tags.findMany({
      where: {
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
      select: {
        id: true,
        discussion_board_tag_id: true,
        created_at: true,
        tag: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  return await ArrayUtil.asyncMap(finalAssociations, async (assoc) => {
    const tag = assoc.tag;
    return {
      id: assoc.id,
      tag_id: assoc.discussion_board_tag_id,
      tag: {
        id: tag.id,
        name: tag.name,
        description: tag.description ?? null,
        created_at: toISOStringSafe(tag.created_at),
        updated_at: toISOStringSafe(tag.updated_at),
        deleted_at: tag.deleted_at ? toISOStringSafe(tag.deleted_at) : null,
      } satisfies IDiscussionBoardTag.ISummary,
      created_at: toISOStringSafe(assoc.created_at),
    } satisfies IDiscussionBoardArticleTagSummary;
  });
}
