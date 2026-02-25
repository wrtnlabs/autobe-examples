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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUsers(props: {
  body: IDiscussionBoardRegisteredUser.IRequest;
}): Promise<IPageIDiscussionBoardRegisteredUser.ISummary> {
  const {
    email,
    displayName,
    isBanned,
    createdAtFrom,
    createdAtTo,
    page = 1,
    limit = 100,
  } = props.body;
  // Validate page number and limit
  const safePage: number = page !== undefined && page >= 1 ? page : 1;
  const safeLimit: number =
    limit !== undefined && limit >= 1 && limit <= 100 ? limit : 100;
  // Build Prisma where filter
  const where: Prisma.discussion_board_registered_usersWhereInput = {};
  if (email !== undefined) {
    where.email = { contains: email };
  }
  if (displayName !== undefined) {
    where.display_name = { contains: displayName };
  }
  if (isBanned !== undefined) {
    where.is_banned = isBanned;
  }
  if (createdAtFrom !== undefined || createdAtTo !== undefined) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (createdAtFrom !== undefined) {
      createdAtFilter.gte = new Date(createdAtFrom);
    }
    if (createdAtTo !== undefined) {
      createdAtFilter.lte = new Date(createdAtTo);
    }
    where.created_at = createdAtFilter;
  }
  const skip = (safePage - 1) * safeLimit;
  const total = await MyGlobal.prisma.discussion_board_registered_users.count({
    where,
  });
  const users =
    await MyGlobal.prisma.discussion_board_registered_users.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: safeLimit,
    });
  const data = users.map((user) => {
    const deletedAt =
      user.deleted_at === null ? null : toISOStringSafe(user.deleted_at);
    return {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      bio: user.bio ?? undefined,
      isBanned: user.is_banned,
      createdAt: toISOStringSafe(user.created_at),
      updatedAt: toISOStringSafe(user.updated_at),
      deletedAt,
    };
  });
  return {
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / safeLimit),
    },
    data,
  } satisfies IPageIDiscussionBoardRegisteredUser.ISummary;
}
