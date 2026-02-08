import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRegisteredUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUserRegisteredUsers(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardRegisteredUser.IRequest;
}): Promise<IPageIDiscussionBoardRegisteredUser.ISummary> {
  // Since filter properties don't exist on IRequest, use default pagination and no filters
  const page = 1;
  const limit = 20;
  const skip = 0;
  // Build where clause without any filters
  const where = {
    deleted_at: null,
  } as const;
  const total = await MyGlobal.prisma.discussion_board_registered_users.count({
    where,
  });
  const records =
    await MyGlobal.prisma.discussion_board_registered_users.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        display_name: true,
        bio: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
      },
    });
  const data = records.map((r) => ({
    id: r.id,
    email: r.email,
    display_name: r.display_name,
    bio: r.bio === null ? null : r.bio,
    is_banned: r.is_banned,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
  }));
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data,
  };
}
