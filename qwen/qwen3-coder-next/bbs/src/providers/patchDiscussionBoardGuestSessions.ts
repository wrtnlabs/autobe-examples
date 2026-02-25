import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberSession";
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
  body: IDiscussionBoardMemberSession.IRequest;
}): Promise<IPageIDiscussionBoardMemberSession.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  // Build where clause for filtering
  const whereClause: Prisma.discussion_board_member_sessionsWhereInput = {
    AND: [
      // Session status filter (active vs expired) - using string comparison
      props.body.sessionStatus === "active"
        ? {
            expired_at: {
              gt: toISOStringSafe(
                props.body.endDate ? new Date(props.body.endDate) : new Date(),
              ),
            },
          }
        : props.body.sessionStatus === "expired"
          ? {
              expired_at: {
                lte: toISOStringSafe(
                  props.body.endDate
                    ? new Date(props.body.endDate)
                    : new Date(),
                ),
              },
            }
          : undefined,
      // Date range filter
      props.body.startDate && props.body.endDate
        ? {
            created_at: {
              gte: toISOStringSafe(new Date(props.body.startDate)),
              lte: toISOStringSafe(new Date(props.body.endDate)),
            },
          }
        : undefined,
    ].filter(
      (c) => c !== undefined,
    ) as Prisma.discussion_board_member_sessionsWhereInput[],
  };
  // Query member sessions
  const memberSessions =
    await MyGlobal.prisma.discussion_board_member_sessions.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        expired_at: true,
        created_at: true,
        updated_at: true,
        last_active_at: true,
        ip: true,
        headers: true,
        member: true,
      },
    });
  // Count total for pagination
  const total: number =
    await MyGlobal.prisma.discussion_board_member_sessions.count({
      where: whereClause,
    });
  // Transform sessions to ISummary format
  const data: IDiscussionBoardMemberSession.ISummary[] = await Promise.all(
    memberSessions.map(async (session) => ({
      id: session.id,
      member: {
        id: session.member.id,
        email: session.member.email,
        display_name: session.member.display_name,
        bio: session.member.bio ?? undefined,
        is_active: session.member.is_active,
        is_admin: session.member.is_admin,
        is_super_admin: session.member.is_super_admin,
        created_at: toISOStringSafe(session.member.created_at),
        updated_at: toISOStringSafe(session.member.updated_at),
      } satisfies IDiscussionBoardMember.ISummary,
      expiredAt: toISOStringSafe(session.expired_at),
      createdAt: toISOStringSafe(session.created_at),
      updatedAt: toISOStringSafe(session.updated_at),
      lastActiveAt: toISOStringSafe(session.last_active_at),
      ip: session.ip,
      headers: session.headers,
    })),
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
