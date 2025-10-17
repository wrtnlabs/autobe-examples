import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminMembers(props: {
  admin: AdminPayload;
  body: IDiscussionBoardMember.IRequest;
}): Promise<IPageIDiscussionBoardMember.ISummary> {
  const { body } = props;

  // Pagination defaults
  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 20) as number;
  const skip = (page - 1) * limit;

  // Allowed sort fields (schema-backed)
  const allowedSortFields = [
    "created_at",
    "registration_completed_at",
    "username",
    "email",
  ];
  const sortBy =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Where conditions, filter deleted_at: null only
  const where = {
    deleted_at: null,
    ...(body.email !== undefined && { email: body.email }),
    ...(body.username !== undefined && { username: body.username }),
    ...(body.email_verified !== undefined && {
      email_verified: body.email_verified,
    }),
    ...(body.registration_completed_after !== undefined ||
    body.registration_completed_before !== undefined
      ? {
          registration_completed_at: {
            ...(body.registration_completed_after !== undefined && {
              gte: body.registration_completed_after,
            }),
            ...(body.registration_completed_before !== undefined && {
              lte: body.registration_completed_before,
            }),
          },
        }
      : {}),
    // Search filter on email OR username (if search value is present)
    ...(body.search
      ? {
          OR: [
            { email: { contains: body.search } },
            { username: { contains: body.search } },
          ],
        }
      : {}),
  };

  // Concurrent query for list and count
  const [members, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_members.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_members.count({ where }),
  ]);

  // Transform results to ISummary (id/username/email)
  const data = members.map((member) => ({
    id: member.id,
    username: member.username,
    email: member.email ?? undefined,
  }));

  // Pagination info
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
