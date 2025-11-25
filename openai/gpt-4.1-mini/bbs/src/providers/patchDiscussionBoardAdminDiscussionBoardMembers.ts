import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardMember";
import { IPageIDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDiscussionBoardMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminDiscussionBoardMembers(props: {
  admin: AdminPayload;
  body: IDiscussionBoardDiscussionBoardMember.IRequest;
}): Promise<IPageIDiscussionBoardDiscussionBoardMember.ISummary> {
  const page =
    Number.isInteger(props.body.page) && props.body.page >= 1
      ? props.body.page
      : 1;
  const limit =
    Number.isInteger(props.body.limit) &&
    props.body.limit >= 1 &&
    props.body.limit <= 100
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;

  const where: any = {
    deleted_at: null,
  };

  if (props.body.search) {
    where.OR = [
      { email: { contains: props.body.search, mode: "insensitive" } },
      { nickname: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  if (props.body.status) {
    where.status = props.body.status;
  }

  if (props.body.role) {
    where.role = props.body.role;
  }

  const allowedSortFields = [
    "id",
    "email",
    "nickname",
    "created_at",
    "updated_at",
  ];
  const sortBy = allowedSortFields.includes(props.body.sortBy ?? "")
    ? props.body.sortBy
    : "created_at";
  const sortOrder =
    props.body.sortOrder === "asc" || props.body.sortOrder === "desc"
      ? props.body.sortOrder
      : "desc";

  const orderBy = {
    [sortBy ?? "created_at"]: sortOrder,
  };

  const [members, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_member.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        email: true,
        nickname: true,
      },
    }),
    MyGlobal.prisma.discussion_board_member.count({ where }),
  ]);

  return {
    data: members.map((member) => ({
      id: member.id,
      email: member.email,
      nickname: member.nickname,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
