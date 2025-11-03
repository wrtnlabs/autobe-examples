import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  const {
    email,
    display_name,
    is_locked,
    has_avatar,
    deleted,
    page = 1,
    page_size = 100,
  } = props.body;

  const where = {
    ...(email !== undefined && { email: { contains: email } }),
    ...(display_name !== undefined && {
      display_name: { contains: display_name },
    }),
    ...(is_locked !== undefined && { is_locked }),
    ...(has_avatar !== undefined &&
      (has_avatar ? { avatar_url: { not: null } } : { avatar_url: null })),
    ...(deleted === true && { deleted_at: { not: null } }),
    ...(deleted === false && { deleted_at: null }),
  };

  const skip = (Number(page) - 1) * Number(page_size);
  const take = Number(page_size);

  const [users, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_users.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take,
      select: {
        id: true,
        display_name: true,
        avatar_url: true,
      },
    }),
    MyGlobal.prisma.discussion_board_users.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: Number(page_size) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / Number(page_size)) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: users.map((u) => ({
      id: u.id,
      display_name: u.display_name,
      avatar_url: u.avatar_url === null ? null : u.avatar_url,
    })),
  };
}
