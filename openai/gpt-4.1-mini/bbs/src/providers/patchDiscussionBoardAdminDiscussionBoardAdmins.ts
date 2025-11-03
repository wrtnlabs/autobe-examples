import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminDiscussionBoardAdmins(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdmin.IRequest;
}): Promise<IPageIDiscussionBoardAdmin.ISummary> {
  const { admin, body } = props;
  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null && {
        email: { contains: body.search },
      }),
  };

  const orderBy =
    body.sortBy !== undefined && body.sortBy !== null
      ? {
          [body.sortBy]: (body.sortOrder === "asc" ? "asc" : "desc") satisfies
            | "asc"
            | "desc" as "asc" | "desc",
        }
      : { created_at: "desc" satisfies "asc" | "desc" as "asc" | "desc" };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admins.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_admins.count({ where }),
  ]);

  const data = results.map((admin) => ({
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at !== null && admin.deleted_at !== undefined
        ? toISOStringSafe(admin.deleted_at)
        : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
    data,
  };
}
