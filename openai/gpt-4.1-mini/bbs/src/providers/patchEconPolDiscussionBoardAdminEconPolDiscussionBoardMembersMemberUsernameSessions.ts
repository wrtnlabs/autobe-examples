import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMemberSession";
import { IPageIEconPolDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPolDiscussionBoardMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchEconPolDiscussionBoardAdminEconPolDiscussionBoardMembersMemberUsernameSessions(props: {
  admin: AdminPayload;
  memberUsername: string;
  body: IEconPolDiscussionBoardMemberSession.IRequest;
}): Promise<IPageIEconPolDiscussionBoardMemberSession.ISummary> {
  /** Find the member by username, throw 404 if not found */
  const member =
    await MyGlobal.prisma.econ_pol_discussion_board_members.findUnique({
      where: { username: props.memberUsername },
      select: { id: true },
    });

  if (member === null) {
    throw new HttpException("Member not found", 404);
  }

  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  /**
   * Build the filter conditions for active sessions related to the identified
   * member
   */
  const whereCondition: Prisma.econ_pol_discussion_board_member_sessionsWhereInput =
    {
      econ_pol_discussion_board_member_id: member.id,
      expired_at: null, // active means not expired
    };

  // Extend the filter with optional search keyword for ip, href, referrer
  if (props.body.search !== undefined && props.body.search.trim() !== "") {
    // Prisma's `OR` filter for search
    whereCondition.OR = [
      { ip: { contains: props.body.search } },
      { href: { contains: props.body.search } },
      { referrer: { contains: props.body.search } },
    ];
  }

  // Filter by status if provided and equals 'active'
  if (props.body.status !== undefined) {
    if (props.body.status === "active") {
      // active sessions already filtered by expired_at = null
      // no additional filter needed
    } else {
      // For other status values, no sessions match as this impl only supports 'active'
      // Immediately return empty page
      return {
        pagination: {
          current: page,
          limit: limit,
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
  }

  // Add created_at date range filters if provided
  if (props.body.created_from !== undefined) {
    if (
      whereCondition.created_at !== undefined &&
      typeof whereCondition.created_at === "object" &&
      !(whereCondition.created_at instanceof Date)
    ) {
      whereCondition.created_at = {
        ...whereCondition.created_at,
        gte: props.body.created_from,
      };
    } else {
      whereCondition.created_at = {
        gte: props.body.created_from,
      };
    }
  }

  if (props.body.created_to !== undefined) {
    if (
      whereCondition.created_at !== undefined &&
      typeof whereCondition.created_at === "object" &&
      !(whereCondition.created_at instanceof Date)
    ) {
      whereCondition.created_at = {
        ...whereCondition.created_at,
        lte: props.body.created_to,
      };
    } else {
      whereCondition.created_at = {
        lte: props.body.created_to,
      };
    }
  }

  /** Query sessions with pagination and sorting */
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.econ_pol_discussion_board_member_sessions.findMany({
      where: whereCondition,
      skip: skip,
      take: limit,
      orderBy: {
        [props.body.sort_by ?? "created_at"]: props.body.order ?? "desc",
      },
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    }),
    MyGlobal.prisma.econ_pol_discussion_board_member_sessions.count({
      where: whereCondition,
    }),
  ]);

  /** Map database results to API response interface with proper transformations */
  const mappedSessions = sessions.map((session) => ({
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at !== null ? toISOStringSafe(session.expired_at) : null,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: mappedSessions,
  };
}
