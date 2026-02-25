import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserUnban";
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

export async function patchDiscussionBoardSuperAdministratorAdministratorUnbans(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardUserUnban.IRequest;
}): Promise<IPageIDiscussionBoardUserUnban.ISummary> {
  const page = props.body.page ?? 1;
  if (page < 1) throw new HttpException("Page must be at least 1", 400);
  const limit = props.body.limit ?? 100;
  if (limit < 1 || limit > 100)
    throw new HttpException("Limit must be between 1 and 100", 400);
  const where: Prisma.discussion_board_user_unbansWhereInput = {
    deleted_at: null,
  };
  if (props.body.administratorId) {
    where.administrator_id = props.body.administratorId;
  }
  if (props.body.createdAfter) {
    if (isNaN(Date.parse(props.body.createdAfter))) {
      throw new HttpException("Invalid createdAfter date", 400);
    }
    where.created_at = { gte: props.body.createdAfter };
  }
  if (props.body.createdBefore) {
    if (isNaN(Date.parse(props.body.createdBefore))) {
      throw new HttpException("Invalid createdBefore date", 400);
    }
    if (where.created_at && typeof where.created_at === "object") {
      where.created_at = {
        ...where.created_at,
        lt: props.body.createdBefore,
      };
    } else {
      where.created_at = { lt: props.body.createdBefore };
    }
  }
  const skip = (page - 1) * limit;
  const unbans = await MyGlobal.prisma.discussion_board_user_unbans.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      userBan: {
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
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
      administrator: {
        select: {
          id: true,
          email: true,
          grade: {
            select: {
              id: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.discussion_board_user_unbans.count({
    where,
  });
  function convertGrade(
    grade: any | null,
  ): IDiscussionBoardAdministratorGrade.ISummary {
    if (!grade) {
      throw new HttpException("Administrator grade not found", 500);
    }
    return {
      id: grade.id,
      createdAt: toISOStringSafe(grade.created_at ?? null),
      updatedAt: toISOStringSafe(grade.updated_at ?? null),
      deletedAt: toISOStringSafe(grade.deleted_at ?? null),
    } satisfies IDiscussionBoardAdministratorGrade.ISummary;
  }
  function convertAdministrator(
    administrator: any | null,
  ): IDiscussionBoardAdministrator.ISummary {
    if (!administrator) {
      throw new HttpException("Administrator not found", 500);
    }
    return {
      id: administrator.id,
      email: administrator.email,
      grade: convertGrade(administrator.grade),
      createdAt: toISOStringSafe(administrator.created_at ?? null),
      updatedAt: toISOStringSafe(administrator.updated_at ?? null),
      deletedAt: toISOStringSafe(administrator.deleted_at ?? null),
    } satisfies IDiscussionBoardAdministrator.ISummary;
  }
  function convertRegisteredUser(
    user: any,
  ): IDiscussionBoardRegisteredUser.ISummary {
    return {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      bio: user.bio ?? null,
      isBanned: user.is_banned,
      createdAt: toISOStringSafe(user.created_at ?? null),
      updatedAt: toISOStringSafe(user.updated_at ?? null),
      deletedAt: toISOStringSafe(user.deleted_at ?? null),
    } satisfies IDiscussionBoardRegisteredUser.ISummary;
  }
  function convertUserBan(ban: any): IDiscussionBoardUserBan.ISummary {
    return {
      id: ban.id,
      reason: ban.reason,
      bannedAt: toISOStringSafe(ban.banned_at ?? null),
      createdAt: toISOStringSafe(ban.created_at ?? null),
      updatedAt: toISOStringSafe(ban.updated_at ?? null),
      deletedAt: toISOStringSafe(ban.deleted_at ?? null),
      registeredUser: convertRegisteredUser(ban.registeredUser),
      administrator: convertAdministrator(ban.administrator),
    } satisfies IDiscussionBoardUserBan.ISummary;
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: unbans.map((record) => {
      if (!record.administrator) {
        throw new HttpException("Administrator missing on unban record", 500);
      }
      return {
        id: record.id,
        reason: record.reason,
        createdAt: toISOStringSafe(record.created_at ?? null),
        updatedAt: toISOStringSafe(record.updated_at ?? null),
        deletedAt: toISOStringSafe(record.deleted_at ?? null),
        userBan: convertUserBan(record.userBan),
        administrator: convertAdministrator(record.administrator),
      } satisfies IDiscussionBoardUserUnban.ISummary;
    }),
  } satisfies IPageIDiscussionBoardUserUnban.ISummary;
}
