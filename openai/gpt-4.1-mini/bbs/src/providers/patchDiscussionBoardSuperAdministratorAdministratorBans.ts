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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdministratorAdministratorBans(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardUserBan.IRequest;
}): Promise<IPageIDiscussionBoardUserBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.discussion_board_user_bansWhereInput = {
    deleted_at: null,
    ...(props.body.registeredUserId
      ? { registered_user_id: props.body.registeredUserId }
      : {}),
    ...(props.body.administratorId
      ? { administrator_id: props.body.administratorId }
      : {}),
    ...(props.body.reason ? { reason: { contains: props.body.reason } } : {}),
  };
  if (props.body.banStart || props.body.banEnd) {
    where.banned_at = {};
    if (props.body.banStart) where.banned_at.gte = props.body.banStart;
    if (props.body.banEnd) where.banned_at.lte = props.body.banEnd;
  }
  const [records, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_user_bans.findMany({
      where,
      skip,
      take: limit,
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
                level: true,
              },
            },
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_user_bans.count({ where }),
  ]);
  const data: IDiscussionBoardUserBan.ISummary[] = records.map((record) => ({
    id: record.id,
    reason: record.reason,
    bannedAt: toISOStringSafe(record.banned_at) as string &
      tags.Format<"date-time">,
    createdAt: toISOStringSafe(record.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(record.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt:
      record.deleted_at === null
        ? null
        : (toISOStringSafe(record.deleted_at) as string &
            tags.Format<"date-time">),
    registeredUser: {
      id: record.registeredUser.id,
      email: record.registeredUser.email,
      displayName: record.registeredUser.display_name,
      bio:
        record.registeredUser.bio === null
          ? undefined
          : record.registeredUser.bio,
      isBanned: record.registeredUser.is_banned,
      createdAt: toISOStringSafe(record.registeredUser.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(record.registeredUser.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt:
        record.registeredUser.deleted_at === null
          ? null
          : (toISOStringSafe(record.registeredUser.deleted_at) as string &
              tags.Format<"date-time">),
    },
    administrator:
      record.administrator === null
        ? null
        : {
            id: record.administrator.id,
            email: record.administrator.email,
            grade: {
              id: record.administrator.grade.id,
              name: record.administrator.grade.name,
              level: record.administrator.grade.level,
            },
            created_at: toISOStringSafe(
              record.administrator.created_at,
            ) as string & tags.Format<"date-time">,
            updated_at: toISOStringSafe(
              record.administrator.updated_at,
            ) as string & tags.Format<"date-time">,
            deleted_at:
              record.administrator.deleted_at === null
                ? null
                : (toISOStringSafe(record.administrator.deleted_at) as string &
                    tags.Format<"date-time">),
          },
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
