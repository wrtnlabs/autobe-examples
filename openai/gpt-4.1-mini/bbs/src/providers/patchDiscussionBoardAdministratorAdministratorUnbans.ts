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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorAdministratorUnbans(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardUserUnban.IRequest;
}): Promise<IPageIDiscussionBoardUserUnban.ISummary> {
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;
  const where: Prisma.discussion_board_user_unbansWhereInput = {
    deleted_at: null,
    ...(props.body.administratorId
      ? { administrator_id: props.body.administratorId }
      : {}),
    ...(props.body.createdAfter
      ? { created_at: { gte: props.body.createdAfter } }
      : {}),
    ...(props.body.createdBefore
      ? { created_at: { lt: props.body.createdBefore } }
      : {}),
  };
  const total = await MyGlobal.prisma.discussion_board_user_unbans.count({
    where,
  });
  const records = await MyGlobal.prisma.discussion_board_user_unbans.findMany({
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
                  name: true,
                  level: true,
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
              name: true,
              level: true,
            },
          },
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const convDate = (
    date: Date | null | undefined,
  ): string & tags.Format<"date-time"> => {
    if (date === null || date === undefined)
      return "" as string & tags.Format<"date-time">;
    return toISOStringSafe(date);
  };
  const data = records.map((record) => {
    return {
      id: record.id,
      reason: record.reason,
      createdAt: convDate(record.created_at),
      updatedAt: convDate(record.updated_at),
      deletedAt: convDate(record.deleted_at),
      userBan: {
        id: record.userBan.id,
        reason: record.userBan.reason,
        bannedAt: convDate(record.userBan.banned_at),
        createdAt: convDate(record.userBan.created_at),
        updatedAt: convDate(record.userBan.updated_at),
        deletedAt: convDate(record.userBan.deleted_at),
        registeredUser: {
          id: record.userBan.registeredUser.id,
          email: record.userBan.registeredUser.email,
          displayName: record.userBan.registeredUser.display_name,
          bio: record.userBan.registeredUser.bio ?? null,
          isBanned: record.userBan.registeredUser.is_banned,
          createdAt: convDate(record.userBan.registeredUser.created_at),
          updatedAt: convDate(record.userBan.registeredUser.updated_at),
          deletedAt: convDate(record.userBan.registeredUser.deleted_at),
        } satisfies IDiscussionBoardRegisteredUser.ISummary,
        administrator: record.userBan.administrator
          ? ({
              id: record.userBan.administrator.id,
              email: record.userBan.administrator.email,
              grade: {
                id: record.userBan.administrator.grade.id,
                name: record.userBan.administrator.grade.name,
                summary: "",
                level: record.userBan.administrator.grade.level,
              },
              created_at: convDate(record.userBan.administrator.created_at),
              updated_at: convDate(record.userBan.administrator.updated_at),
              deleted_at: convDate(record.userBan.administrator.deleted_at),
            } satisfies IDiscussionBoardAdministrator.ISummary)
          : null,
      } satisfies IDiscussionBoardUserBan.ISummary,
      administrator: {
        id: record.administrator.id,
        email: record.administrator.email,
        grade: {
          id: record.administrator.grade.id,
          name: record.administrator.grade.name,
          summary: "",
          level: record.administrator.grade.level,
        },
        created_at: convDate(record.administrator.created_at),
        updated_at: convDate(record.administrator.updated_at),
        deleted_at: convDate(record.administrator.deleted_at),
      } satisfies IDiscussionBoardAdministrator.ISummary,
    } satisfies IDiscussionBoardUserUnban.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  } satisfies IPageIDiscussionBoardUserUnban.ISummary;
}
