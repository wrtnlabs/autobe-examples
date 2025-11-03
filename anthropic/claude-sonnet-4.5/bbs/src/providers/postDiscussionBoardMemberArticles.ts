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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberArticles(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  const { member, body } = props;

  const articleId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const categories = await MyGlobal.prisma.discussion_board_categories.findMany(
    {
      where: {
        id: { in: body.category_ids as string[] },
      },
    },
  );

  if (categories.length !== body.category_ids.length) {
    throw new HttpException("One or more category IDs are invalid", 400);
  }

  if (body.tag_ids && body.tag_ids.length > 0) {
    const tags = await MyGlobal.prisma.discussion_board_tags.findMany({
      where: {
        id: { in: body.tag_ids as string[] },
      },
    });

    if (tags.length !== body.tag_ids.length) {
      throw new HttpException("One or more tag IDs are invalid", 400);
    }
  }

  if (body.image_ids && body.image_ids.length > 0) {
    const images =
      await MyGlobal.prisma.discussion_board_article_images.findMany({
        where: {
          id: { in: body.image_ids as string[] },
        },
      });

    if (images.length !== body.image_ids.length) {
      throw new HttpException("One or more image IDs are invalid", 400);
    }

    const invalidImages = images.filter(
      (img) =>
        img.uploaded_by_member_id !== member.id || img.deleted_at !== null,
    );

    if (invalidImages.length > 0) {
      throw new HttpException("One or more images are not accessible", 403);
    }
  }

  if (body.document_ids && body.document_ids.length > 0) {
    const documents =
      await MyGlobal.prisma.discussion_board_article_documents.findMany({
        where: {
          id: { in: body.document_ids as string[] },
        },
      });

    if (documents.length !== body.document_ids.length) {
      throw new HttpException("One or more document IDs are invalid", 400);
    }

    const invalidDocuments = documents.filter(
      (doc) =>
        doc.uploaded_by_member_id !== member.id || doc.deleted_at !== null,
    );

    if (invalidDocuments.length > 0) {
      throw new HttpException("One or more documents are not accessible", 403);
    }
  }

  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discussion_board_articles.create({
      data: {
        id: articleId,
        discussion_board_member_id: member.id,
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

    await tx.discussion_board_article_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_article_id: articleId,
        created_by_member_id: member.id,
        title: body.title,
        body: body.body,
        summary: body.summary ?? null,
        status: "published",
        created_at: now,
      },
    });

    await tx.discussion_board_article_categories.createMany({
      data: body.category_ids.map((categoryId) => ({
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_article_id: articleId,
        discussion_board_category_id: categoryId,
        created_at: now,
      })),
    });

    if (body.tag_ids && body.tag_ids.length > 0) {
      await tx.discussion_board_article_tags.createMany({
        data: body.tag_ids.map((tagId) => ({
          id: v4() as string & tags.Format<"uuid">,
          discussion_board_article_id: articleId,
          discussion_board_tag_id: tagId,
          created_at: now,
        })),
      });
    }

    if (body.image_ids && body.image_ids.length > 0) {
      await tx.discussion_board_article_images.updateMany({
        where: {
          id: { in: body.image_ids as string[] },
        },
        data: {
          discussion_board_article_id: articleId,
        },
      });
    }

    if (body.document_ids && body.document_ids.length > 0) {
      await tx.discussion_board_article_documents.updateMany({
        where: {
          id: { in: body.document_ids as string[] },
        },
        data: {
          discussion_board_article_id: articleId,
        },
      });
    }
  });

  const completeArticle =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: articleId },
      include: {
        author: true,
        discussion_board_article_categories: {
          include: {
            category: true,
          },
        },
        discussion_board_article_tags: {
          include: {
            tag: true,
          },
        },
        discussion_board_article_images: {
          where: { deleted_at: null },
          include: {
            uploader: true,
          },
        },
        discussion_board_article_documents: {
          where: { deleted_at: null },
          include: {
            uploader: true,
          },
        },
      },
    });

  return {
    id: completeArticle.id as string & tags.Format<"uuid">,
    discussion_board_member_id:
      completeArticle.discussion_board_member_id as string &
        tags.Format<"uuid">,
    last_modified_by_moderator_id:
      completeArticle.last_modified_by_moderator_id as
        | (string & tags.Format<"uuid">)
        | null,
    title: completeArticle.title,
    body: completeArticle.body,
    summary: completeArticle.summary,
    status: completeArticle.status as "published" | "draft" | "archived",
    view_count: completeArticle.view_count,
    comment_count: completeArticle.comment_count,
    created_at: toISOStringSafe(completeArticle.created_at),
    updated_at: toISOStringSafe(completeArticle.updated_at),
    deleted_at: completeArticle.deleted_at
      ? toISOStringSafe(completeArticle.deleted_at)
      : null,
    author: {
      id: completeArticle.author.id as string & tags.Format<"uuid">,
      username: completeArticle.author.username,
      display_name: completeArticle.author.display_name,
      profile_picture_url: completeArticle.author.profile_picture_url as
        | (string & tags.Format<"uri">)
        | null,
    },
    lastModifiedByModerator: null,
    categories: completeArticle.discussion_board_article_categories.map(
      (ac) => ({
        id: ac.category.id as string & tags.Format<"uuid">,
        name: ac.category.name,
        slug: ac.category.slug,
        description: ac.category.description,
        created_at: toISOStringSafe(ac.category.created_at),
        updated_at: toISOStringSafe(ac.category.updated_at),
      }),
    ),
    tags: completeArticle.discussion_board_article_tags.map((at) => ({
      id: at.tag.id as string & tags.Format<"uuid">,
      name: at.tag.name,
      slug: at.tag.slug,
      created_at: toISOStringSafe(at.tag.created_at),
      updated_at: toISOStringSafe(at.tag.updated_at),
    })),
    images: completeArticle.discussion_board_article_images.map((img) => ({
      id: img.id as string & tags.Format<"uuid">,
      discussion_board_article_id: img.discussion_board_article_id as string &
        tags.Format<"uuid">,
      uploaded_by_member_id: img.uploaded_by_member_id as string &
        tags.Format<"uuid">,
      url: `/storage/images/${img.stored_name}` as string & tags.Format<"uri">,
      original_name: img.original_name,
      stored_name: img.stored_name,
      mime_type: img.mime_type,
      size_bytes: img.size_bytes,
      width: img.width,
      height: img.height,
      created_at: toISOStringSafe(img.created_at),
      deleted_at: img.deleted_at ? toISOStringSafe(img.deleted_at) : null,
      uploader: {
        id: img.uploader.id as string & tags.Format<"uuid">,
        username: img.uploader.username,
        display_name: img.uploader.display_name,
        profile_picture_url: img.uploader.profile_picture_url as
          | (string & tags.Format<"uri">)
          | null,
      },
    })),
    documents: completeArticle.discussion_board_article_documents.map(
      (doc) => ({
        id: doc.id as string & tags.Format<"uuid">,
        discussion_board_article_id: doc.discussion_board_article_id as string &
          tags.Format<"uuid">,
        uploaded_by_member_id: doc.uploaded_by_member_id as string &
          tags.Format<"uuid">,
        original_name: doc.original_name,
        stored_name: doc.stored_name,
        mime_type: doc.mime_type,
        size_bytes: doc.size_bytes,
        created_at: toISOStringSafe(doc.created_at),
        deleted_at: doc.deleted_at ? toISOStringSafe(doc.deleted_at) : null,
        uploader: {
          id: doc.uploader.id as string & tags.Format<"uuid">,
          username: doc.uploader.username,
          display_name: doc.uploader.display_name,
          profile_picture_url: doc.uploader.profile_picture_url as
            | (string & tags.Format<"uri">)
            | null,
        },
      }),
    ),
  };
}
