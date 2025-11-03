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

export async function putDiscussionBoardMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  const { member, articleId, body } = props;

  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: articleId,
      deleted_at: null,
    },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  if (article.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own articles",
      403,
    );
  }

  await MyGlobal.prisma.discussion_board_article_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_article_id: article.id,
      created_by_member_id: member.id,
      title: article.title,
      body: article.body,
      summary: article.summary,
      status: article.status,
      created_at: toISOStringSafe(new Date()),
    },
  });

  if (body.category_ids !== undefined) {
    await MyGlobal.prisma.discussion_board_article_categories.deleteMany({
      where: { discussion_board_article_id: articleId },
    });

    if (body.category_ids.length > 0) {
      await MyGlobal.prisma.discussion_board_article_categories.createMany({
        data: body.category_ids.map((categoryId) => ({
          id: v4() as string & tags.Format<"uuid">,
          discussion_board_article_id: articleId,
          discussion_board_category_id: categoryId,
          created_at: toISOStringSafe(new Date()),
        })),
      });
    }
  }

  if (body.tag_ids !== undefined) {
    await MyGlobal.prisma.discussion_board_article_tags.deleteMany({
      where: { discussion_board_article_id: articleId },
    });

    if (body.tag_ids.length > 0) {
      await MyGlobal.prisma.discussion_board_article_tags.createMany({
        data: body.tag_ids.map((tagId) => ({
          id: v4() as string & tags.Format<"uuid">,
          discussion_board_article_id: articleId,
          discussion_board_tag_id: tagId,
          created_at: toISOStringSafe(new Date()),
        })),
      });
    }
  }

  if (body.remove_image_ids !== undefined && body.remove_image_ids.length > 0) {
    await MyGlobal.prisma.discussion_board_article_images.updateMany({
      where: {
        id: { in: body.remove_image_ids },
        discussion_board_article_id: articleId,
      },
      data: {
        deleted_at: toISOStringSafe(new Date()),
      },
    });
  }

  if (
    body.remove_document_ids !== undefined &&
    body.remove_document_ids.length > 0
  ) {
    await MyGlobal.prisma.discussion_board_article_documents.updateMany({
      where: {
        id: { in: body.remove_document_ids },
        discussion_board_article_id: articleId,
      },
      data: {
        deleted_at: toISOStringSafe(new Date()),
      },
    });
  }

  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: articleId },
    data: {
      title: body.title ?? undefined,
      body: body.body ?? undefined,
      summary: body.summary === null ? null : (body.summary ?? undefined),
      status: body.status ?? undefined,
      updated_at: now,
    },
  });

  const [authorData, categoriesData, tagsData, imagesData, documentsData] =
    await Promise.all([
      MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
        where: { id: updated.discussion_board_member_id },
      }),
      MyGlobal.prisma.discussion_board_article_categories.findMany({
        where: { discussion_board_article_id: articleId },
        include: { category: true },
      }),
      MyGlobal.prisma.discussion_board_article_tags.findMany({
        where: { discussion_board_article_id: articleId },
        include: { tag: true },
      }),
      MyGlobal.prisma.discussion_board_article_images.findMany({
        where: {
          discussion_board_article_id: articleId,
          deleted_at: null,
        },
        include: { uploader: true },
      }),
      MyGlobal.prisma.discussion_board_article_documents.findMany({
        where: {
          discussion_board_article_id: articleId,
          deleted_at: null,
        },
        include: { uploader: true },
      }),
    ]);

  return {
    id: updated.id,
    discussion_board_member_id: updated.discussion_board_member_id,
    last_modified_by_moderator_id: updated.last_modified_by_moderator_id,
    title: updated.title,
    body: updated.body,
    summary: updated.summary,
    status: updated.status as "published" | "draft" | "archived",
    view_count: updated.view_count,
    comment_count: updated.comment_count,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    author: {
      id: authorData.id,
      username: authorData.username,
      display_name: authorData.display_name,
      profile_picture_url: authorData.profile_picture_url,
    },
    lastModifiedByModerator: undefined,
    categories: categoriesData.map((ac) => ({
      id: ac.category.id,
      name: ac.category.name,
      slug: ac.category.slug,
      description: ac.category.description,
      created_at: toISOStringSafe(ac.category.created_at),
      updated_at: toISOStringSafe(ac.category.updated_at),
    })),
    tags: tagsData.map((at) => ({
      id: at.tag.id,
      name: at.tag.name,
      slug: at.tag.slug,
      created_at: toISOStringSafe(at.tag.created_at),
      updated_at: toISOStringSafe(at.tag.updated_at),
    })),
    images: imagesData.map((img) => ({
      id: img.id,
      discussion_board_article_id: img.discussion_board_article_id,
      uploaded_by_member_id: img.uploaded_by_member_id,
      url: typia.random<string & tags.Format<"uri">>(),
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
        display_name: img.uploader.display_name,
        profile_picture_url: img.uploader.profile_picture_url,
      },
    })),
    documents: documentsData.map((doc) => ({
      id: doc.id,
      discussion_board_article_id: doc.discussion_board_article_id,
      uploaded_by_member_id: doc.uploaded_by_member_id,
      original_name: doc.original_name,
      stored_name: doc.stored_name,
      mime_type: doc.mime_type,
      size_bytes: doc.size_bytes,
      created_at: toISOStringSafe(doc.created_at),
      deleted_at: doc.deleted_at ? toISOStringSafe(doc.deleted_at) : undefined,
      uploader: {
        id: doc.uploader.id,
        username: doc.uploader.username,
        display_name: doc.uploader.display_name,
        profile_picture_url: doc.uploader.profile_picture_url,
      },
    })),
  };
}
