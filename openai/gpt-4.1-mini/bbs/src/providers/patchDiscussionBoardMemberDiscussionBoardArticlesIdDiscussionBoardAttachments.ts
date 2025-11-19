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

export async function patchDiscussionBoardMemberDiscussionBoardArticlesIdDiscussionBoardAttachments(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.IRequest;
}): Promise<IPageIDiscussionBoardAttachment.ISummary> {
  // Verify the targeted article exists and belongs to the member
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.id },
    select: { id: true, discussion_board_member_id: true, deleted_at: true },
  });

  if (!article || article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }

  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Build where condition
  const where: Prisma.discussion_board_attachmentsWhereInput = {
    discussion_board_article_id: props.id,
    deleted_at: null,
  };

  if (props.body.filterByType) {
    where.type = props.body.filterByType;
  }

  // Determine orderBy
  let orderBy: Prisma.discussion_board_attachmentsOrderByWithRelationInput = {
    created_at: "desc",
  };

  if (props.body.sortBy) {
    const sortField = props.body.sortBy;
    let prismaField: keyof Prisma.discussion_board_attachmentsOrderByWithRelationInput;
    switch (sortField) {
      case "createdAt":
        prismaField = "created_at";
        break;
      case "fileName":
        prismaField = "filename";
        break;
      case "type":
        prismaField = "type";
        break;
      default:
        prismaField = "created_at";
    }

    orderBy = {
      [prismaField]: props.body.sortOrder === "asc" ? "asc" : "desc",
    };
  }

  // Pagination calculation
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Fetch data and total count concurrently
  const [attachments, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_attachments.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_attachments.count({ where }),
  ]);

  // Map to ISummary
  const data: IDiscussionBoardAttachment.ISummary[] = attachments.map((a) => ({
    id: a.id,
    type: a.type,
    filename: a.filename,
    url: a.url,
  }));

  // Construct pagination info
  const pagination = {
    current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
    records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
    pages: Math.ceil(total / limit) as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  };

  return {
    data,
    pagination,
  };
}
