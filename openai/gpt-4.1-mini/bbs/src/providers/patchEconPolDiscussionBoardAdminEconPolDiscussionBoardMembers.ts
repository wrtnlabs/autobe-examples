import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";
import { IPageIEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPolDiscussionBoardMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchEconPolDiscussionBoardAdminEconPolDiscussionBoardMembers(props: {
  admin: AdminPayload;
  body: IEconPolDiscussionBoardMember.IRequest;
}): Promise<IPageIEconPolDiscussionBoardMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const search = props.body.search?.trim();
  const whereCondition = search
    ? {
        OR: [
          { username: { contains: search } },
          { email: { contains: search } },
        ],
      }
    : {};

  const validSortColumns = [
    "username",
    "email",
    "created_at",
    "updated_at",
  ] as const;

  const sortBy =
    props.body.sort_by && validSortColumns.includes(props.body.sort_by)
      ? props.body.sort_by
      : "created_at";

  const sortOrder = props.body.sort_order === "asc" ? "asc" : "desc";

  const skipForQuery = skip satisfies number as number satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limitForQuery = limit satisfies number as number satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const pageForQuery = page satisfies number as number satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  const [members, total] = await Promise.all([
    MyGlobal.prisma.econ_pol_discussion_board_members.findMany({
      where: whereCondition,
      skip: skipForQuery,
      take: limitForQuery,
      orderBy: { [sortBy!]: sortOrder },
    }),
    MyGlobal.prisma.econ_pol_discussion_board_members.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: pageForQuery,
      limit: limitForQuery,
      records: total,
      pages: Math.ceil(total / limitForQuery),
    },
    data: members.map((member) => ({
      id: member.id,
      username: member.username,
      displayName: member.username,
      avatarUrl: null,
      memberSince: toISOStringSafe(member.created_at),
    })),
  };
}
