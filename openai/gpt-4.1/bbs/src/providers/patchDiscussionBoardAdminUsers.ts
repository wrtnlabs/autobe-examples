import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminUsers(props: {
  admin: AdminPayload;
  body: IDiscussionBoardUser.IRequest;
}): Promise<IPageIDiscussionBoardUser.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    ...(props.body.email !== undefined &&
      props.body.email !== null && {
        email: {
          contains: props.body.email,
          mode: Prisma.QueryMode.insensitive,
        },
      }),
  };
  const [users, count] = await Promise.all([
    MyGlobal.prisma.discussion_board_users.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.discussion_board_users.count({ where }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: count,
      pages: Math.ceil(count / limit),
    },
    data: users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: toISOStringSafe(u.created_at),
      updated_at: toISOStringSafe(u.updated_at),
      deleted_at:
        u.deleted_at !== null ? toISOStringSafe(u.deleted_at) : undefined,
    })),
  };
}
