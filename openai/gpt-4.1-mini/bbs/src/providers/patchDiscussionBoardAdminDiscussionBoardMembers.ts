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

export async function patchDiscussionBoardAdminDiscussionBoardMembers(props: {
  admin: AdminPayload;
  body: IDiscussionBoardMember.IRequest;
}): Promise<IPageIDiscussionBoardMember.ISummary> {
  const { body } = props;

  const search = body.search;
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  let limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> as number;
  if (limit > 100) limit = 100;
  const sortBy = body.sortBy ?? "created_at";
  const sortOrder = body.sortOrder ?? "desc";
  const includeDeleted = body.includeDeleted ?? false;

  const where = {
    ...(includeDeleted ? {} : { deleted_at: null }),
    ...(search !== undefined &&
      search !== null && { email: { contains: search } }),
  };

  const [members, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_members.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_members.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: members.map((m) => ({
      id: m.id,
      email: m.email,
      created_at: toISOStringSafe(m.created_at),
      updated_at: toISOStringSafe(m.updated_at),
    })),
  };
}
