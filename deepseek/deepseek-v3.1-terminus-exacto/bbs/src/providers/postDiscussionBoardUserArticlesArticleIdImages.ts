import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserArticlesArticleIdImages(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.ICreate;
}): Promise<IDiscussionBoardArticleFile> {
  // Verify article exists and user is owner
  const article =
    await MyGlobal.prisma.discussion_board_articles.findFirstOrThrow({
      where: {
        id: props.articleId,
        deleted_at: null,
      },
      select: {
        id: true,
        discussion_board_user_id: true,
      },
    });
  if (article.discussion_board_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify attachment file exists and uses correct field name
  const attachmentFile =
    await MyGlobal.prisma.discussion_board_article_files.findFirstOrThrow({
      where: {
        id: props.body.attachment_file_id,
        file_type: { startsWith: "image/" },
      },
    });
  if (!attachmentFile.file_type?.startsWith("image/")) {
    throw new HttpException("Attachment file must be an image", 400);
  }
  // Check maximum images per article limit (10)
  const existingImagesCount =
    await MyGlobal.prisma.discussion_board_article_images.count({
      where: {
        discussion_board_article_id: props.articleId,
        status: { in: ["uploaded", "processing", "active"] },
      },
    });
  if (existingImagesCount >= 10) {
    throw new HttpException("Maximum 10 images allowed per article", 400);
  }
  // Calculate next display order
  const lastImage =
    await MyGlobal.prisma.discussion_board_article_images.findFirst({
      where: { discussion_board_article_id: props.articleId },
      orderBy: { display_order: "desc" },
      select: { display_order: true },
    });
  const nextOrder = lastImage ? lastImage.display_order + 1 : 0;
  // Create the image record with explicit status
  const image = await MyGlobal.prisma.discussion_board_article_images.create({
    data: {
      id: v4(),
      discussion_board_article_id: props.articleId,
      attachment_file_id: props.body.attachment_file_id,
      status: "uploaded",
      display_order: nextOrder,
      alt_text: props.body.alt_text ?? null,
      caption: props.body.caption ?? null,
    },
    include: {
      article: {
        select: {
          id: true,
          title: true,
          status: true,
          created_at: true,
          author: {
            select: {
              id: true,
              display_name: true,
              bio: true,
              created_at: true,
            },
          },
          section: {
            select: {
              id: true,
              name: true,
              description: true,
              status: true,
              display_order: true,
              deleted_at: true,
            },
          },
        },
      },
    },
  });
  // Manual transformation using correct field names
  return {
    id: image.id,
    attachment_file: {
      id: attachmentFile.id,
      filename: attachmentFile.file_name,
      file_size: attachmentFile.file_size,
      mime_type: attachmentFile.file_type,
      storage_path: attachmentFile.storage_path,
      original_filename: attachmentFile.file_name,
      width: null,
      height: null,
      created_at: toISOStringSafe(attachmentFile.created_at),
      updated_at: toISOStringSafe(attachmentFile.updated_at),
    } satisfies IDiscussionBoardAttachmentFile,
    status: image.status,
    display_order: image.display_order,
    alt_text: image.alt_text ?? null,
    caption: image.caption ?? null,
    article: {
      id: image.article.id,
      title: image.article.title,
      status: image.article.status,
      created_at: toISOStringSafe(image.article.created_at),
      author: {
        id: image.article.author.id,
        display_name: image.article.author.display_name,
        bio: image.article.author.bio,
        created_at: toISOStringSafe(image.article.author.created_at),
      } satisfies IDiscussionBoardUser.ISummary,
      section: {
        id: image.article.section.id,
        name: image.article.section.name,
        description: image.article.section.description,
        status: image.article.section.status,
        display_order: image.article.section.display_order,
        deleted_at: image.article.section.deleted_at
          ? toISOStringSafe(image.article.section.deleted_at)
          : null,
      } satisfies IDiscussionBoardSection.ISummary,
    } satisfies IDiscussionBoardArticle.ISummary,
  } satisfies IDiscussionBoardArticleFile;
}
