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

export async function getDiscussionBoardArticlesArticleId(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticle> {
  const { articleId } = props;

  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: {
      id: articleId,
      deleted_at: null,
    },
    include: {
      author: true,
      lastModifiedByModerator: true,
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
        where: {
          deleted_at: null,
        },
        include: {
          uploader: true,
        },
      },
      discussion_board_article_documents: {
        where: {
          deleted_at: null,
        },
        include: {
          uploader: true,
        },
      },
    },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  const updatedArticle = await MyGlobal.prisma.discussion_board_articles.update(
    {
      where: { id: articleId },
      data: {
        view_count: article.view_count + 1,
      },
    },
  );

  const newViewCount = updatedArticle.view_count;

  return {
    id: article.id as string & tags.Format<"uuid">,
    discussion_board_member_id: article.discussion_board_member_id as string &
      tags.Format<"uuid">,
    last_modified_by_moderator_id: article.last_modified_by_moderator_id
      ? (article.last_modified_by_moderator_id as string & tags.Format<"uuid">)
      : null,
    title: article.title,
    body: article.body,
    summary: article.summary !== null ? article.summary : undefined,
    status: article.status as "published" | "draft" | "archived",
    view_count: newViewCount,
    comment_count: article.comment_count,
    created_at: toISOStringSafe(article.created_at),
    updated_at: toISOStringSafe(article.updated_at),
    deleted_at: article.deleted_at
      ? toISOStringSafe(article.deleted_at)
      : undefined,
    author: {
      id: article.author.id as string & tags.Format<"uuid">,
      username: article.author.username,
      display_name:
        article.author.display_name !== null
          ? article.author.display_name
          : undefined,
      profile_picture_url: article.author.profile_picture_url
        ? (article.author.profile_picture_url as string & tags.Format<"uri">)
        : undefined,
    },
    lastModifiedByModerator: article.lastModifiedByModerator
      ? {
          id: article.lastModifiedByModerator.id as string &
            tags.Format<"uuid">,
          username: article.lastModifiedByModerator.username,
          display_name: article.lastModifiedByModerator.display_name,
          profile_picture_url: article.lastModifiedByModerator
            .profile_picture_url
            ? (article.lastModifiedByModerator.profile_picture_url as string &
                tags.Format<"uri">)
            : null,
          email_verified: article.lastModifiedByModerator.email_verified,
          status: article.lastModifiedByModerator.status,
          moderation_permissions:
            article.lastModifiedByModerator.moderation_permissions,
          profile_visibility:
            article.lastModifiedByModerator.profile_visibility,
          activity_visibility:
            article.lastModifiedByModerator.activity_visibility,
          bio:
            article.lastModifiedByModerator.bio !== null
              ? article.lastModifiedByModerator.bio
              : undefined,
          location:
            article.lastModifiedByModerator.location !== null
              ? article.lastModifiedByModerator.location
              : undefined,
          website_url: article.lastModifiedByModerator.website_url
            ? (article.lastModifiedByModerator.website_url as string &
                tags.Format<"uri">)
            : undefined,
          last_login_at: article.lastModifiedByModerator.last_login_at
            ? toISOStringSafe(article.lastModifiedByModerator.last_login_at)
            : undefined,
          created_at: toISOStringSafe(
            article.lastModifiedByModerator.created_at,
          ),
          updated_at: toISOStringSafe(
            article.lastModifiedByModerator.updated_at,
          ),
          deleted_at: article.lastModifiedByModerator.deleted_at
            ? toISOStringSafe(article.lastModifiedByModerator.deleted_at)
            : undefined,
        }
      : undefined,
    categories: article.discussion_board_article_categories.map((ac) => ({
      id: ac.category.id as string & tags.Format<"uuid">,
      name: ac.category.name,
      slug: ac.category.slug,
      description:
        ac.category.description !== null ? ac.category.description : undefined,
      created_at: toISOStringSafe(ac.category.created_at),
      updated_at: toISOStringSafe(ac.category.updated_at),
    })),
    tags: article.discussion_board_article_tags.map((at) => ({
      id: at.tag.id as string & tags.Format<"uuid">,
      name: at.tag.name,
      slug: at.tag.slug,
      created_at: toISOStringSafe(at.tag.created_at),
      updated_at: toISOStringSafe(at.tag.updated_at),
    })),
    images: article.discussion_board_article_images.map((img) => ({
      id: img.id as string & tags.Format<"uuid">,
      discussion_board_article_id: img.discussion_board_article_id as string &
        tags.Format<"uuid">,
      uploaded_by_member_id: img.uploaded_by_member_id as string &
        tags.Format<"uuid">,
      url: img.stored_name as string & tags.Format<"uri">,
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
        display_name:
          img.uploader.display_name !== null
            ? img.uploader.display_name
            : undefined,
        profile_picture_url: img.uploader.profile_picture_url
          ? (img.uploader.profile_picture_url as string & tags.Format<"uri">)
          : undefined,
      },
    })),
    documents: article.discussion_board_article_documents.map((doc) => ({
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
      deleted_at: doc.deleted_at ? toISOStringSafe(doc.deleted_at) : undefined,
      uploader: {
        id: doc.uploader.id as string & tags.Format<"uuid">,
        username: doc.uploader.username,
        display_name:
          doc.uploader.display_name !== null
            ? doc.uploader.display_name
            : undefined,
        profile_picture_url: doc.uploader.profile_picture_url
          ? (doc.uploader.profile_picture_url as string & tags.Format<"uri">)
          : undefined,
      },
    })),
  };
}
