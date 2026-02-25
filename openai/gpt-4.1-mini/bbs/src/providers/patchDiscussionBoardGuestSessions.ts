import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardGuestSessions(props: {
  guest: GuestPayload;
  body: IDiscussionBoardRegisteredUserSession.IRequest;
}): Promise<IPageIDiscussionBoardRegisteredUserSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    ...(props.body.ip && { ip: props.body.ip }),
    ...(props.body.createdAtFrom && {
      created_at: { gte: props.body.createdAtFrom },
    }),
    ...(props.body.createdAtTo && {
      created_at: { lte: props.body.createdAtTo },
    }),
    ...(props.body.expiredAtFrom && {
      expired_at: { gte: props.body.expiredAtFrom },
    }),
    ...(props.body.expiredAtTo && {
      expired_at: { lte: props.body.expiredAtTo },
    }),
  };
  const records =
    await MyGlobal.prisma.discussion_board_guest_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        guest: { select: { id: true, deleted_at: true } },
        ip: true,
        created_at: true,
        expired_at: true,
      },
    });
  const total = await MyGlobal.prisma.discussion_board_guest_sessions.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      registered_user_id: "00000000-0000-0000-0000-000000000000" as string &
        tags.Format<"uuid">,
      registeredUser: {
        id: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
        email: "" as string,
        displayName: "" as string,
        bio: null,
        isBanned: false,
        createdAt: "1970-01-01T00:00:00.000Z" as string &
          tags.Format<"date-time">,
        updatedAt: "1970-01-01T00:00:00.000Z" as string &
          tags.Format<"date-time">,
        deletedAt: null,
      },
      guest: {
        id: record.guest.id,
        deletedAt: record.guest.deleted_at ?? null,
      },
      ip: record.ip,
      created_at: toISOStringSafe(record.created_at),
      expired_at: record.expired_at ? toISOStringSafe(record.expired_at) : null,
    })),
  };
}
