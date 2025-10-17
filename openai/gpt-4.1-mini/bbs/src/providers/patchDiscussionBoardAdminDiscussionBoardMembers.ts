import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
}): Promise<IPageIDiscussionBoardDiscussionBoardMember> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null as null,
    ...(body.search !== undefined && body.search !== null
      ? {
          OR: [
            { email: { contains: body.search } },
            { display_name: { contains: body.search } },
          ],
        }
      : {}),
  };

  const orderByFieldMap: Record<
    string,
    "email" | "display_name" | "created_at"
  > = {
    email: "email",
    displayName: "display_name",
    createdAt: "created_at",
  };

  const orderByField = body.orderBy ?? "createdAt";
  const orderFieldName = orderByFieldMap[orderByField] ?? "created_at";

  const orderDirection =
    body.orderDirection !== undefined &&
    body.orderDirection !== null &&
    body.orderDirection.toUpperCase() === "ASC"
      ? "asc"
      : "desc";

  const orderBy = {
    [orderFieldName]: orderDirection,
  };

  const [members, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_members.findMany({
      where,
      orderBy,
      skip,
      take: limit,
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
    data: members.map((member) => ({
      id: member.id,
      email: member.email,
      display_name: member.display_name,
      password_hash: member.password_hash,
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
      deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    })),
  };
}
