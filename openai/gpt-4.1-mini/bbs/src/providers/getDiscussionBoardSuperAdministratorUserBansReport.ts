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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdministratorUserBansReport(props: {
  superAdministrator: SuperadministratorPayload;
}): Promise<IPageIDiscussionBoardUserBan.ISummary> {
  const bans = await MyGlobal.prisma.discussion_board_user_bans.findMany({
    where: { deleted_at: null },
    orderBy: { banned_at: "desc" },
    select: {
      id: true,
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
          grade_id: true,
          email: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      reason: true,
      banned_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    pagination: {
      current: 1,
      limit: bans.length,
      records: bans.length,
      pages: 1,
    },
    data: bans.map((ban) => ({
      id: ban.id,
      registeredUser: {
        id: ban.registeredUser.id,
        email: ban.registeredUser.email,
        display_name: ban.registeredUser.display_name,
        bio: ban.registeredUser.bio === null ? null : ban.registeredUser.bio,
        is_banned: ban.registeredUser.is_banned,
        created_at: toISOStringSafe(ban.registeredUser.created_at),
        updated_at: toISOStringSafe(ban.registeredUser.updated_at),
        deleted_at:
          ban.registeredUser.deleted_at === null
            ? null
            : toISOStringSafe(ban.registeredUser.deleted_at),
      },
      administrator:
        ban.administrator === null
          ? null
          : {
              id: ban.administrator.id,
              grade_id: ban.administrator.grade_id,
              email: ban.administrator.email,
              created_at: toISOStringSafe(ban.administrator.created_at),
              updated_at: toISOStringSafe(ban.administrator.updated_at),
              deleted_at:
                ban.administrator.deleted_at === null
                  ? null
                  : toISOStringSafe(ban.administrator.deleted_at),
            },
      reason: ban.reason,
      banned_at: toISOStringSafe(ban.banned_at),
      created_at: toISOStringSafe(ban.created_at),
      updated_at: toISOStringSafe(ban.updated_at),
      deleted_at:
        ban.deleted_at === null ? null : toISOStringSafe(ban.deleted_at),
    })),
  };
}
