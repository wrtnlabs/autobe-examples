import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuestSession";
import { IPageIEconPolDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPolDiscussionBoardGuestSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchEconPolDiscussionBoardAdminEconPolDiscussionBoardGuestsGuestIdSessions(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
  body: IEconPolDiscussionBoardGuestSession.IRequest;
}): Promise<IPageIEconPolDiscussionBoardGuestSession.ISummary> {
  // Validate pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Validate sortBy and sortOrder with safe defaults
  const validSortByValues = ["created_at", "updated_at"] as const;
  const validSortOrderValues = ["asc", "desc"] as const;
  const sortBy = validSortByValues.includes(props.body.sortBy ?? "created_at")
    ? (props.body.sortBy ?? "created_at")
    : "created_at";
  const sortOrder = validSortOrderValues.includes(
    props.body.sortOrder ?? "desc",
  )
    ? (props.body.sortOrder ?? "desc")
    : "desc";

  // Build where condition with guestId and optional search filter
  const whereCondition = {
    econ_pol_discussion_board_guest_id: props.guestId,
    AND: [
      {
        OR: [
          { ip: { contains: props.body.search ?? "" } },
          { href: { contains: props.body.search ?? "" } },
          { referrer: { contains: props.body.search ?? "" } },
        ],
      },
      { expired_at: null },
    ],
  };

  // Fetch data and count in parallel
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.econ_pol_discussion_board_guest_sessions.findMany({
      where: whereCondition,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        econ_pol_discussion_board_guest_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    }),
    MyGlobal.prisma.econ_pol_discussion_board_guest_sessions.count({
      where: whereCondition,
    }),
  ]);

  // Transform sessions to ISummary type with proper date formatting and null/undefined handling
  const data: IPageIEconPolDiscussionBoardGuestSession.ISummary["data"] =
    sessions.map((session) => ({
      id: session.id,
      econ_pol_discussion_board_guest_id:
        session.econ_pol_discussion_board_guest_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at:
        session.expired_at === null || session.expired_at === undefined
          ? null
          : toISOStringSafe(session.expired_at),
    }));

  // Build pagination info
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    data,
    pagination,
  };
}
