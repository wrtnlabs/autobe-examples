import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleCollector } from "../collectors/DiscussionBoardArticleCollector";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardRegisteredUserArticles(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardArticle.ICreate & {
    title?: string | null;
    content?: string | null;
    sectionId?: string | null;
    files?:
      | {
          fileName: string;
          fileType?: string | null;
          fileSize?: number | null;
          downloadUrl?: string | null;
          description?: string | null;
          displayOrder?: number | null;
        }[]
      | null;
    images?:
      | {
          imageUrl?: string | null;
          description?: string | null;
          displayOrder?: number | null;
        }[]
      | null;
    tags?:
      | {
          id: string;
        }[]
      | null;
  };
}): Promise<IDiscussionBoardArticle> {
  if (!props.body.title || props.body.title.trim() === "") {
    throw new HttpException("Title must not be empty", 400);
  }
  if (!props.body.content) {
    throw new HttpException("Content is required", 400);
  }
  if (!props.body.sectionId) {
    throw new HttpException("Section ID is required", 400);
  }
  const sectionId = props.body.sectionId;
  if (sectionId === null || sectionId === undefined) {
    throw new HttpException("Invalid Section ID", 400);
  }
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: sectionId },
    select: { id: true },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  const createdArticle = await MyGlobal.prisma.$transaction(async (tx) => {
    const articleData = await DiscussionBoardArticleCollector.collect({
      body: props.body,
      discussionBoardRegisteredUsers: { id: props.registeredUser.id },
      section: { id: sectionId },
    });
    const article = await tx.discussion_board_articles.create({
      data: {
        ...articleData,
      },
      include: {
        author: true,
        section: true,
      },
    });
    if (
      props.body.files &&
      Array.isArray(props.body.files) &&
      props.body.files.length > 0
    ) {
      for (const file of props.body.files) {
        const fileData: any = {
          id: v4() as string & tags.Format<"uuid">,
          file_name: file.fileName,
          article: { connect: { id: article.id } },
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        };
        if (file.fileType !== null && file.fileType !== undefined) {
          fileData.file_type = file.fileType;
        }
        if (file.fileSize !== null && file.fileSize !== undefined) {
          fileData.file_size = file.fileSize;
        }
        if (file.downloadUrl !== null && file.downloadUrl !== undefined) {
          fileData.download_url = file.downloadUrl;
        }
        if (file.displayOrder !== null && file.displayOrder !== undefined) {
          fileData.display_order = file.displayOrder;
        }
        await tx.discussion_board_article_files.create({ data: fileData });
      }
    }
    if (
      props.body.images &&
      Array.isArray(props.body.images) &&
      props.body.images.length > 0
    ) {
      for (const image of props.body.images) {
        const imageData: any = {
          id: v4() as string & tags.Format<"uuid">,
          article: { connect: { id: article.id } },
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        };
        if (image.imageUrl !== null && image.imageUrl !== undefined) {
          imageData.image_url = image.imageUrl;
        }
        if (image.displayOrder !== null && image.displayOrder !== undefined) {
          imageData.display_order = image.displayOrder;
        }
        await tx.discussion_board_article_images.create({ data: imageData });
      }
    }
    if (
      props.body.tags &&
      Array.isArray(props.body.tags) &&
      props.body.tags.length > 0
    ) {
      for (const tag of props.body.tags) {
        await tx.discussion_board_article_tag_mappings.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            article: { connect: { id: article.id } },
            tag: { connect: { id: tag.id } },
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
          },
        });
      }
    }
    return article;
  });
  return createdArticle;
}
