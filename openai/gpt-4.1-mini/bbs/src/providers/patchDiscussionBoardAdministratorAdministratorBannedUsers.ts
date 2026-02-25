import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorAdministratorBannedUsers(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardUserBan.IRequest;
}): Promise<IPageIDiscussionBoardUserBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const safePage = page < 1 ? 1 : page;
  const safeLimit = limit < 1 ? 1 : limit > 100 ? 100 : limit;
  const where: Prisma.discussion_board_user_bansWhereInput = {
    deleted_at: null,
    ...(props.body.registeredUserId
      ? { registered_user_id: props.body.registeredUserId }
      : {}),
    ...(props.body.administratorId
      ? { administrator_id: props.body.administratorId }
      : {}),
    ...(props.body.reason ? { reason: { contains: props.body.reason } } : {}),
    ...(props.body.banStart ? { banned_at: { gte: props.body.banStart } } : {}),
    ...(props.body.banEnd ? { banned_at: { lte: props.body.banEnd } } : {}),
  };
  const skip = (safePage - 1) * safeLimit;
  const bans = await MyGlobal.prisma.discussion_board_user_bans.findMany({
    where,
    skip,
    take: safeLimit,
    orderBy: { banned_at: "desc" },
    select: {
      id: true,
      reason: true,
      banned_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      registeredUser: {
        select: {
          id: true,
          email: true,
          display_name: true,
          bio: true,
          is_banned: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      administrator: {
        select: {
          id: true,
          email: true,
          grade: {
            select: {
              id: true,
              name: true,
            },
          },
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.discussion_board_user_bans.count({
    where,
  });
  return {
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
    data: bans.map((ban) => ({
      id: ban.id,
      reason: ban.reason,
      bannedAt: toISOStringSafe(ban.banned_at),
      createdAt: toISOStringSafe(ban.created_at),
      updatedAt: toISOStringSafe(ban.updated_at),
      deletedAt: ban.deleted_at ? toISOStringSafe(ban.deleted_at) : null,
      registeredUser: {
        id: ban.registeredUser.id,
        email: ban.registeredUser.email,
        displayName: ban.registeredUser.display_name,
        bio: ban.registeredUser.bio ?? null,
        isBanned: ban.registeredUser.is_banned,
        createdAt: toISOStringSafe(ban.registeredUser.created_at),
        updatedAt: toISOStringSafe(ban.registeredUser.updated_at),
        deletedAt: ban.registeredUser.deleted_at
          ? toISOStringSafe(ban.registeredUser.deleted_at)
          : null,
      },
      administrator: ban.administrator
        ? {
            id: ban.administrator.id,
            email: ban.administrator.email,
            grade: {
              id: ban.administrator.grade.id,
              name: ban.administrator.grade.name,
            },
            created_at: toISOStringSafe(ban.administrator.created_at),
            updated_at: toISOStringSafe(ban.administrator.updated_at),
            deleted_at: ban.administrator.deleted_at
              ? toISOStringSafe(ban.administrator.deleted_at)
              : null,
          }
        : null,
    })),
  };
}
