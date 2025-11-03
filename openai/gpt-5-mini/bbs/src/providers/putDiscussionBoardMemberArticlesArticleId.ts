import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  const { member, articleId, body } = props;

  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: articleId },
  });
  if (!article || article.deleted_at !== null)
    throw new HttpException("Not Found", 404);

  if (article.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: Only the author may update this article",
      403,
    );
  }

  const EDIT_WINDOW_MS = 15 * 60 * 1000;
  const createdAtMs = new Date(article.created_at).getTime();
  const nowMs = Date.now();
  if (nowMs - createdAtMs > EDIT_WINDOW_MS) {
    throw new HttpException("Forbidden: Edit window expired", 403);
  }

  let resolvedCategoryId: string | null | undefined = undefined;
  if (body.category_slug !== undefined) {
    if (body.category_slug === null) {
      resolvedCategoryId = null;
    } else {
      const cat = await MyGlobal.prisma.discussion_board_categories.findFirst({
        where: { slug: body.category_slug, deleted_at: null, is_active: true },
      });
      if (!cat) throw new HttpException("Category not found", 400);
      resolvedCategoryId = cat.id;
    }
  }

  let tagIdsToAdd: string[] = [];
  let tagIdsToDelete: string[] = [];
  if (body.tag_slugs !== undefined) {
    const provided = body.tag_slugs ?? [];
    if (provided.length > 10)
      throw new HttpException("Too many tags (max 10)", 400);

    const found = await MyGlobal.prisma.discussion_board_tags.findMany({
      where: { slug: { in: provided }, deleted_at: null, is_active: true },
    });

    const uniqProvided = Array.from(
      new Set(provided.filter((s) => s !== null && s !== undefined)),
    );
    if (found.length !== uniqProvided.length)
      throw new HttpException("One or more tags not found or inactive", 400);

    const currentLinks =
      await MyGlobal.prisma.discussion_board_article_tags.findMany({
        where: { discussion_board_article_id: articleId },
      });
    const currentTagIds = currentLinks.map((r) => r.discussion_board_tag_id);
    const desiredTagIds = found.map((t) => t.id);

    tagIdsToAdd = desiredTagIds.filter((id) => !currentTagIds.includes(id));
    tagIdsToDelete = currentTagIds.filter((id) => !desiredTagIds.includes(id));
  }

  const now = toISOStringSafe(new Date());
  const updatePayload = {
    ...(body.title !== undefined && { title: body.title }),
    ...(body.content !== undefined && { content: body.content }),
    ...(body.state !== undefined && { state: body.state }),
    ...(body.is_pinned !== undefined && { is_pinned: body.is_pinned }),
    ...(body.category_slug !== undefined && {
      discussion_board_category_id: resolvedCategoryId,
    }),
    updated_at: now,
    ...(body.state === "published" &&
      article.published_at === null && { published_at: now }),
  };

  const snapshotCreate =
    MyGlobal.prisma.discussion_board_article_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_article_id: articleId,
        title: article.title,
        content: article.content,
        state: article.state,
        snapshot_at: now,
        created_at: toISOStringSafe(article.created_at),
        updated_at: toISOStringSafe(article.updated_at),
        deleted_at: article.deleted_at
          ? toISOStringSafe(article.deleted_at)
          : null,
      },
    });

  const updateResult = MyGlobal.prisma.discussion_board_articles.updateMany({
    where: { id: articleId, updated_at: article.updated_at },
    data: updatePayload,
  });

  const [, updateRes] = await MyGlobal.prisma.$transaction([
    snapshotCreate,
    updateResult,
  ]);
  if (updateRes.count === 0)
    throw new HttpException("Conflict: concurrent modification", 409);

  if (body.tag_slugs !== undefined) {
    const deletes = tagIdsToDelete.map((tagId) =>
      MyGlobal.prisma.discussion_board_article_tags.deleteMany({
        where: {
          discussion_board_article_id: articleId,
          discussion_board_tag_id: tagId,
        },
      }),
    );

    const creates = tagIdsToAdd.map((tagId) =>
      MyGlobal.prisma.discussion_board_article_tags.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          discussion_board_article_id: articleId,
          discussion_board_tag_id: tagId,
          created_at: now,
          created_by_member_id: member.id,
        },
      }),
    );

    await MyGlobal.prisma.$transaction([...deletes, ...creates]);
  }

  const updated =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: articleId },
      include: {
        author: true,
        discussion_board_attachments: { include: { uploader: true } },
        category: true,
        discussion_board_article_tags: { include: { tag: true } },
      },
    });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    title: updated.title,
    content: updated.content,
    author: updated.author
      ? {
          id: updated.author.id as string & tags.Format<"uuid">,
          username: updated.author.username,
          display_name: updated.author.display_name ?? null,
          created_at: toISOStringSafe(updated.author.created_at),
        }
      : null,
    is_pinned: updated.is_pinned,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    attachments: (updated.discussion_board_attachments ?? []).map((a) => ({
      id: a.id as string & tags.Format<"uuid">,
      original_filename: a.original_filename,
      mime_type: a.mime_type,
      size: a.size,
      is_image: a.is_image,
      created_at: toISOStringSafe(a.created_at),
      uploader: a.uploader
        ? {
            id: a.uploader.id as string & tags.Format<"uuid">,
            username: a.uploader.username,
            display_name: a.uploader.display_name ?? null,
            created_at: toISOStringSafe(a.uploader.created_at),
          }
        : null,
      downloadUrl: null,
      cdnUrl: null,
    })),
    state: updated.state as "draft" | "published" | "pending_review" | "hidden",
    published_at: updated.published_at
      ? toISOStringSafe(updated.published_at)
      : null,
    category: updated.category
      ? {
          id: updated.category.id as string & tags.Format<"uuid">,
          name: updated.category.name,
          slug: updated.category.slug,
          description: updated.category.description ?? null,
          is_active: updated.category.is_active,
          sort_order: updated.category.sort_order ?? null,
          created_at: toISOStringSafe(updated.category.created_at),
          updated_at: updated.category.updated_at
            ? toISOStringSafe(updated.category.updated_at)
            : null,
          deleted_at: updated.category.deleted_at
            ? toISOStringSafe(updated.category.deleted_at)
            : null,
        }
      : undefined,
    tags: (updated.discussion_board_article_tags ?? []).map((rel) => ({
      id: rel.tag.id as string & tags.Format<"uuid">,
      name: rel.tag.name,
      slug: rel.tag.slug,
      description: rel.tag.description ?? null,
      is_active: rel.tag.is_active,
      created_at: toISOStringSafe(rel.tag.created_at),
      updated_at: rel.tag.updated_at
        ? toISOStringSafe(rel.tag.updated_at)
        : null,
      deleted_at: rel.tag.deleted_at
        ? toISOStringSafe(rel.tag.deleted_at)
        : null,
    })),
  };
}
