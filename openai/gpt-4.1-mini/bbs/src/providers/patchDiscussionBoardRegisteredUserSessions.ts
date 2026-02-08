import { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRegisteredUserSession";
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

export async function patchDiscussionBoardRegisteredUserSessions(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardRegisteredUserSession.IRequest;
}): Promise<IPageIDiscussionBoardRegisteredUserSession.ISummary> {
  // Validate pagination with defaults
  const page = 1;
  const limit = 10;
  // Build where filter
  const where: Prisma.discussion_board_registered_user_sessionsWhereInput = {};
  // Calculate skip for pagination
  const skip = 0;
  // Retrieve data from database
  const records =
    await MyGlobal.prisma.discussion_board_registered_user_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        registered_user_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
  // Count total records
  const total =
    await MyGlobal.prisma.discussion_board_registered_user_sessions.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      registeredUserId: record.registered_user_id,
      ip: record.ip ?? null,
      href: record.href ?? null,
      referrer: record.referrer ?? null,
      createdAt: toISOStringSafe(record.created_at),
      expiredAt: record.expired_at ? toISOStringSafe(record.expired_at) : null,
      deletedAt: null,
    })),
  };
}
