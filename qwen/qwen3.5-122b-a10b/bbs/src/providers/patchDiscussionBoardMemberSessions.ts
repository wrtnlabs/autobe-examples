import { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardAdminAtSummaryTransformer } from "../transformers/DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardGuestAtSummaryTransformer } from "../transformers/DiscussionBoardGuestAtSummaryTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "../transformers/DiscussionBoardMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberSessions(props: {
  member: MemberPayload;
  body: IDiscussionBoardGuestSession.IRequest;
}): Promise<IPageIDiscussionBoardGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Determine which session types to query
  const queryMember =
    props.body.session_type === undefined ||
    props.body.session_type === "member";
  const queryAdmin =
    props.body.session_type === undefined ||
    props.body.session_type === "admin";
  const queryGuest =
    props.body.session_type === undefined ||
    props.body.session_type === "guest";
  // Build common WHERE conditions
  const buildMemberWhere = ():
    | Prisma.discussion_board_member_sessionsWhereInput
    | undefined => {
    const conditions: Prisma.discussion_board_member_sessionsWhereInput[] = [];
    if (props.body.member_id) {
      conditions.push({ discussion_board_member_id: props.body.member_id });
    }
    if (props.body.ip) {
      conditions.push({ ip: props.body.ip });
    }
    if (props.body.created_at_from || props.body.created_at_to) {
      const dateRange: Prisma.DateTimeFilter = {};
      if (props.body.created_at_from) {
        dateRange.gte = new Date(props.body.created_at_from);
      }
      if (props.body.created_at_to) {
        dateRange.lte = new Date(props.body.created_at_to);
      }
      conditions.push({ created_at: dateRange });
    }
    if (props.body.expired !== undefined) {
      const now = new Date();
      if (props.body.expired) {
        conditions.push({ expired_at: { lt: now } });
      } else {
        conditions.push({ expired_at: { gte: now } });
      }
    }
    return conditions.length > 0 ? { AND: conditions } : undefined;
  };
  const buildAdminWhere = ():
    | Prisma.discussion_board_admin_sessionsWhereInput
    | undefined => {
    const conditions: Prisma.discussion_board_admin_sessionsWhereInput[] = [];
    if (props.body.admin_id) {
      conditions.push({ discussion_board_admin_id: props.body.admin_id });
    }
    if (props.body.ip) {
      conditions.push({ ip: props.body.ip });
    }
    if (props.body.created_at_from || props.body.created_at_to) {
      const dateRange: Prisma.DateTimeFilter = {};
      if (props.body.created_at_from) {
        dateRange.gte = new Date(props.body.created_at_from);
      }
      if (props.body.created_at_to) {
        dateRange.lte = new Date(props.body.created_at_to);
      }
      conditions.push({ created_at: dateRange });
    }
    if (props.body.expired !== undefined) {
      const now = new Date();
      if (props.body.expired) {
        conditions.push({ expired_at: { lt: now } });
      } else {
        conditions.push({ expired_at: { gte: now } });
      }
    }
    return conditions.length > 0 ? { AND: conditions } : undefined;
  };
  const buildGuestWhere = ():
    | Prisma.discussion_board_guest_sessionsWhereInput
    | undefined => {
    const conditions: Prisma.discussion_board_guest_sessionsWhereInput[] = [];
    if (props.body.guest_id) {
      conditions.push({ discussion_board_guest_id: props.body.guest_id });
    }
    if (props.body.ip) {
      conditions.push({ ip: props.body.ip });
    }
    if (props.body.created_at_from || props.body.created_at_to) {
      const dateRange: Prisma.DateTimeFilter = {};
      if (props.body.created_at_from) {
        dateRange.gte = new Date(props.body.created_at_from);
      }
      if (props.body.created_at_to) {
        dateRange.lte = new Date(props.body.created_at_to);
      }
      conditions.push({ created_at: dateRange });
    }
    if (props.body.expired !== undefined) {
      const now = new Date();
      if (props.body.expired) {
        conditions.push({ expired_at: { lt: now } });
      } else {
        conditions.push({ expired_at: { gte: now } });
      }
    }
    return conditions.length > 0 ? { AND: conditions } : undefined;
  };
  // Determine sort order
  const orderByField = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  const orderByInput = { [orderByField]: sortOrder };
  // Query member sessions
  const memberSessions = queryMember
    ? await MyGlobal.prisma.discussion_board_member_sessions.findMany({
        where: buildMemberWhere(),
        skip,
        take: limit,
        orderBy: orderByInput,
        include: {
          member: {
            select: DiscussionBoardMemberAtSummaryTransformer.select().select,
          },
        },
      })
    : [];
  // Query admin sessions
  const adminSessions = queryAdmin
    ? await MyGlobal.prisma.discussion_board_admin_sessions.findMany({
        where: buildAdminWhere(),
        skip,
        take: limit,
        orderBy: orderByInput,
        include: {
          discussionBoardAdmin: {
            select: DiscussionBoardAdminAtSummaryTransformer.select().select,
          },
        },
      })
    : [];
  // Query guest sessions
  const guestSessions = queryGuest
    ? await MyGlobal.prisma.discussion_board_guest_sessions.findMany({
        where: buildGuestWhere(),
        skip,
        take: limit,
        orderBy: orderByInput,
        include: {
          guest: {
            select: DiscussionBoardGuestAtSummaryTransformer.select().select,
          },
        },
      })
    : [];
  // Merge all sessions
  const allSessions = [...memberSessions, ...adminSessions, ...guestSessions];
  // Count totals for each type
  const totalMember = queryMember
    ? await MyGlobal.prisma.discussion_board_member_sessions.count({
        where: buildMemberWhere(),
      })
    : 0;
  const totalAdmin = queryAdmin
    ? await MyGlobal.prisma.discussion_board_admin_sessions.count({
        where: buildAdminWhere(),
      })
    : 0;
  const totalGuest = queryGuest
    ? await MyGlobal.prisma.discussion_board_guest_sessions.count({
        where: buildGuestWhere(),
      })
    : 0;
  const total = totalMember + totalAdmin + totalGuest;
  // Transform sessions to ISummary
  const data = await Promise.all(
    allSessions.map(async (session) => {
      if ("member" in session) {
        return {
          id: session.id,
          type: "member" as const,
          ip: session.ip,
          href: session.href,
          referrer: session.referrer ?? null,
          user: typia.assert<IDiscussionBoardGuestSession.ISummary["user"]>(
            await DiscussionBoardMemberAtSummaryTransformer.transform(
              session.member,
            ),
          ),
          created_at: toISOStringSafe(session.created_at),
          expired_at: toISOStringSafe(session.expired_at),
        } satisfies IDiscussionBoardGuestSession.ISummary;
      } else if ("discussionBoardAdmin" in session) {
        return {
          id: session.id,
          type: "admin" as const,
          ip: session.ip,
          href: session.href,
          referrer: session.referrer ?? null,
          user: typia.assert<IDiscussionBoardGuestSession.ISummary["user"]>(
            await DiscussionBoardAdminAtSummaryTransformer.transform(
              session.discussionBoardAdmin,
            ),
          ),
          created_at: toISOStringSafe(session.created_at),
          expired_at: toISOStringSafe(session.expired_at),
        } satisfies IDiscussionBoardGuestSession.ISummary;
      } else {
        return {
          id: session.id,
          type: "guest" as const,
          ip: session.ip,
          href: session.href,
          referrer: session.referrer ?? null,
          user: typia.assert<IDiscussionBoardGuestSession.ISummary["user"]>(
            await DiscussionBoardGuestAtSummaryTransformer.transform(
              session.guest,
            ),
          ),
          created_at: toISOStringSafe(session.created_at),
          expired_at: toISOStringSafe(session.expired_at),
        } satisfies IDiscussionBoardGuestSession.ISummary;
      }
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
