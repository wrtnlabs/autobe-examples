import { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuestSession";
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

export async function patchDiscussionBoardGuestGuestSessions(props: {
  guest: GuestPayload;
  body: IDiscussionBoardGuestSession.IRequest;
}): Promise<IPageIDiscussionBoardGuestSession.ISummary> {
  // IRequest is empty; default pagination values
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Remove invalid property: deleted_at is not in discussion_board_guest_sessionsWhereInput
  const where: Prisma.discussion_board_guest_sessionsWhereInput = {
    discussion_board_guest_id: props.guest.id,
  };
  const data = await MyGlobal.prisma.discussion_board_guest_sessions.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.discussion_board_guest_sessions.count({
    where,
  });
  const mappedData: IDiscussionBoardGuestSession.ISummary[] = data.map(
    (record) => ({
      id: record.id,
      guest_id: record.discussion_board_guest_id,
      device_fingerprint: null,
      ip: record.ip === null ? null : record.ip,
      referer: record.referrer === null ? null : record.referrer,
      url: record.href === null ? null : record.href,
      user_agent: null,
      created_at: toISOStringSafe(record.created_at),
      expired_at:
        record.expired_at === null ? null : toISOStringSafe(record.expired_at),
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: mappedData,
  };
}
