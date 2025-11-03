import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberDiscussionBoardArticlesArticleIdDiscussionBoardAttachments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.IRequest;
}): Promise<IPageIDiscussionBoardAttachment.ISummary> {
  const { member, articleId, body } = props;

  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: articleId },
    select: { id: true },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  const memberExists = await MyGlobal.prisma.discussion_board_members.findFirst(
    {
      where: {
        id: member.id,
        deleted_at: null,
      },
      select: { id: true },
    },
  );

  if (!memberExists) {
    throw new HttpException("Unauthorized: Member not found or deleted", 403);
  }

  const where = {
    discussion_board_article_id: articleId,
    deleted_at: null,
    ...(body.filename !== undefined &&
      body.filename !== null && {
        filename: { contains: body.filename },
      }),
    ...(body.file_type !== undefined &&
      body.file_type !== null && {
        file_type: { contains: body.file_type },
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && {
                gte: body.created_at_from,
              }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && {
                lte: body.created_at_to,
              }),
          },
        }
      : {}),
  };

  const validSortBy = [
    "filename",
    "file_type",
    "created_at",
    "updated_at",
  ] as const;
  const sortBy = validSortBy.includes(body.sortBy ?? "created_at")
    ? (body.sortBy ?? "created_at")
    : "created_at";
  const sortOrder = body.sortOrder === "asc" ? "asc" : "desc";

  const skip = ((body.page ?? 1) - 1) * (body.limit ?? 10);
  const take = body.limit ?? 10;

  const [attachments, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_attachments.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take,
    }),
    MyGlobal.prisma.discussion_board_attachments.count({ where }),
  ]);

  return {
    pagination: {
      current: (body.page ?? 1) satisfies number as number,
      limit: (body.limit ?? 10) satisfies number as number,
      records: total,
      pages: Math.ceil(total / take),
    },
    data: attachments.map((attachment) => ({
      id: attachment.id,
      discussion_board_article_id: attachment.discussion_board_article_id,
      filename: attachment.filename,
      file_type: attachment.file_type,
      file_url: attachment.file_url,
      created_at: toISOStringSafe(attachment.created_at),
      updated_at: toISOStringSafe(attachment.updated_at),
      deleted_at: attachment.deleted_at
        ? toISOStringSafe(attachment.deleted_at)
        : null,
    })),
  };
}
