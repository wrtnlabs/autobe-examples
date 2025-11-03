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
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postDiscussionBoardModeratorArticles(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  const { moderator, body } = props;

  const articleId = v4();
  const now = toISOStringSafe(new Date());

  const categories = await MyGlobal.prisma.discussion_board_categories.findMany(
    {
      where: { id: { in: body.category_ids } },
    },
  );

  if (categories.length !== body.category_ids.length) {
    throw new HttpException("One or more categories not found", 404);
  }

  if (body.tag_ids && body.tag_ids.length > 0) {
    const tags = await MyGlobal.prisma.discussion_board_tags.findMany({
      where: { id: { in: body.tag_ids } },
    });

    if (tags.length !== body.tag_ids.length) {
      throw new HttpException("One or more tags not found", 404);
    }
  }

  if (body.image_ids && body.image_ids.length > 0) {
    const images =
      await MyGlobal.prisma.discussion_board_article_images.findMany({
        where: {
          id: { in: body.image_ids },
          deleted_at: null,
        },
      });

    if (images.length !== body.image_ids.length) {
      throw new HttpException("One or more images not found or deleted", 404);
    }
  }

  if (body.document_ids && body.document_ids.length > 0) {
    const documents =
      await MyGlobal.prisma.discussion_board_article_documents.findMany({
        where: {
          id: { in: body.document_ids },
          deleted_at: null,
        },
      });

    if (documents.length !== body.document_ids.length) {
      throw new HttpException(
        "One or more documents not found or deleted",
        404,
      );
    }
  }

  await MyGlobal.prisma.discussion_board_articles.create({
    data: {
      id: articleId,
      discussion_board_member_id: moderator.id,
      last_modified_by_moderator_id: null,
      title: body.title,
      body: body.body,
      summary: body.summary ?? null,
      status: "published",
      view_count: 0,
      comment_count: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  await Promise.all(
    body.category_ids.map((categoryId) =>
      MyGlobal.prisma.discussion_board_article_categories.create({
        data: {
          id: v4(),
          discussion_board_article_id: articleId,
          discussion_board_category_id: categoryId,
          created_at: now,
        },
      }),
    ),
  );

  if (body.tag_ids && body.tag_ids.length > 0) {
    await Promise.all(
      body.tag_ids.map((tagId) =>
        MyGlobal.prisma.discussion_board_article_tags.create({
          data: {
            id: v4(),
            discussion_board_article_id: articleId,
            discussion_board_tag_id: tagId,
            created_at: now,
          },
        }),
      ),
    );
  }

  if (body.image_ids && body.image_ids.length > 0) {
    await MyGlobal.prisma.discussion_board_article_images.updateMany({
      where: { id: { in: body.image_ids } },
      data: { discussion_board_article_id: articleId },
    });
  }

  if (body.document_ids && body.document_ids.length > 0) {
    await MyGlobal.prisma.discussion_board_article_documents.updateMany({
      where: { id: { in: body.document_ids } },
      data: { discussion_board_article_id: articleId },
    });
  }

  await MyGlobal.prisma.discussion_board_article_snapshots.create({
    data: {
      id: v4(),
      discussion_board_article_id: articleId,
      created_by_member_id: moderator.id,
      title: body.title,
      body: body.body,
      summary: body.summary ?? null,
      status: "published",
      created_at: now,
    },
  });

  const created =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: articleId },
      include: {
        author: true,
        lastModifiedByModerator: true,
        discussion_board_article_categories: {
          include: { category: true },
        },
        discussion_board_article_tags: {
          include: { tag: true },
        },
        discussion_board_article_images: {
          where: { deleted_at: null },
          include: { uploader: true },
        },
        discussion_board_article_documents: {
          where: { deleted_at: null },
          include: { uploader: true },
        },
      },
    });

  const statusValue = created.status;
  const articleStatus: "published" | "draft" | "archived" =
    statusValue === "published" ||
    statusValue === "draft" ||
    statusValue === "archived"
      ? statusValue
      : "published";

  return {
    id: created.id,
    discussion_board_member_id: created.discussion_board_member_id,
    last_modified_by_moderator_id:
      created.last_modified_by_moderator_id ?? null,
    title: created.title,
    body: created.body,
    summary: created.summary ?? null,
    status: articleStatus,
    view_count: created.view_count,
    comment_count: created.comment_count,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    author: {
      id: created.author.id,
      username: created.author.username,
      display_name: created.author.display_name ?? null,
      profile_picture_url: created.author.profile_picture_url ?? null,
    },
    lastModifiedByModerator: created.lastModifiedByModerator
      ? {
          id: created.lastModifiedByModerator.id,
          username: created.lastModifiedByModerator.username,
          display_name: created.lastModifiedByModerator.display_name,
          profile_picture_url:
            created.lastModifiedByModerator.profile_picture_url,
          email_verified: created.lastModifiedByModerator.email_verified,
          status: created.lastModifiedByModerator.status,
          moderation_permissions:
            created.lastModifiedByModerator.moderation_permissions,
          profile_visibility:
            created.lastModifiedByModerator.profile_visibility,
          activity_visibility:
            created.lastModifiedByModerator.activity_visibility,
          bio: created.lastModifiedByModerator.bio ?? null,
          location: created.lastModifiedByModerator.location ?? null,
          website_url: created.lastModifiedByModerator.website_url ?? null,
          last_login_at: created.lastModifiedByModerator.last_login_at
            ? toISOStringSafe(created.lastModifiedByModerator.last_login_at)
            : null,
          created_at: toISOStringSafe(
            created.lastModifiedByModerator.created_at,
          ),
          updated_at: toISOStringSafe(
            created.lastModifiedByModerator.updated_at,
          ),
          deleted_at: created.lastModifiedByModerator.deleted_at
            ? toISOStringSafe(created.lastModifiedByModerator.deleted_at)
            : null,
        }
      : null,
    categories: created.discussion_board_article_categories.map((ac) => ({
      id: ac.category.id,
      name: ac.category.name,
      slug: ac.category.slug,
      description: ac.category.description ?? null,
      created_at: toISOStringSafe(ac.category.created_at),
      updated_at: toISOStringSafe(ac.category.updated_at),
    })),
    tags: created.discussion_board_article_tags.map((at) => ({
      id: at.tag.id,
      name: at.tag.name,
      slug: at.tag.slug,
      created_at: toISOStringSafe(at.tag.created_at),
      updated_at: toISOStringSafe(at.tag.updated_at),
    })),
    images: created.discussion_board_article_images.map((img) => ({
      id: img.id,
      discussion_board_article_id: img.discussion_board_article_id,
      uploaded_by_member_id: img.uploaded_by_member_id,
      url: img.stored_name,
      original_name: img.original_name,
      stored_name: img.stored_name,
      mime_type: img.mime_type,
      size_bytes: img.size_bytes,
      width: img.width,
      height: img.height,
      created_at: toISOStringSafe(img.created_at),
      deleted_at: img.deleted_at ? toISOStringSafe(img.deleted_at) : null,
      uploader: {
        id: img.uploader.id,
        username: img.uploader.username,
        display_name: img.uploader.display_name ?? null,
        profile_picture_url: img.uploader.profile_picture_url ?? null,
      },
    })),
    documents: created.discussion_board_article_documents.map((doc) => ({
      id: doc.id,
      discussion_board_article_id: doc.discussion_board_article_id,
      uploaded_by_member_id: doc.uploaded_by_member_id,
      original_name: doc.original_name,
      stored_name: doc.stored_name,
      mime_type: doc.mime_type,
      size_bytes: doc.size_bytes,
      created_at: toISOStringSafe(doc.created_at),
      deleted_at: doc.deleted_at ? toISOStringSafe(doc.deleted_at) : null,
      uploader: {
        id: doc.uploader.id,
        username: doc.uploader.username,
        display_name: doc.uploader.display_name ?? null,
        profile_picture_url: doc.uploader.profile_picture_url ?? null,
      },
    })),
  };
}
