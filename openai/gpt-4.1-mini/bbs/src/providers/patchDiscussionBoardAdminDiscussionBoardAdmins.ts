import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardAdmin";
import { IPageIDiscussionBoardDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDiscussionBoardAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminDiscussionBoardAdmins(props: {
  admin: AdminPayload;
  body: IDiscussionBoardDiscussionBoardAdmin.IRequest;
}): Promise<IPageIDiscussionBoardDiscussionBoardAdmin.ISummary> {
  const { body } = props;

  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 10;
  // Strip brands for prisma usage
  const page = Number(pageRaw);
  const limit = Number(limitRaw);
  const skip = (page - 1) * limit;

  const searchTerm = body.search ?? null;

  const where = {
    deleted_at: null,
    ...(searchTerm !== null
      ? {
          OR: [
            { email: { contains: searchTerm } },
            { display_name: { contains: searchTerm } },
          ],
        }
      : {}),
  };

  const orderByOptions = ["email", "display_name", "created_at"] as const;
  const orderDirOptions = ["asc", "desc"] as const;

  const orderByField = orderByOptions.includes(body.order_by ?? "created_at")
    ? body.order_by!
    : "created_at";
  const orderDirection = orderDirOptions.includes(
    body.order_direction ?? "desc",
  )
    ? body.order_direction!
    : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admins.findMany({
      where,
      select: {
        id: true,
        email: true,
        display_name: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_admins.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
