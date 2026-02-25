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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberSessions(props: {
  body: IDiscussionBoardMemberSession.IRequest;
}): Promise<IPageIDiscussionBoardMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with session filtering
  const whereClause: Prisma.discussion_board_member_sessionsWhereInput = {};
  // Apply date range filter if provided
  if (props.body.startDate !== undefined || props.body.endDate !== undefined) {
    const dateRange: any = {};
    if (props.body.startDate !== undefined && props.body.startDate !== null) {
      dateRange.gte = toISOStringSafe(props.body.startDate);
    }
    if (props.body.endDate !== undefined && props.body.endDate !== null) {
      dateRange.lte = toISOStringSafe(props.body.endDate);
    }
    whereClause.created_at = dateRange;
  }
  // Fetch session list
  const sessions =
    await MyGlobal.prisma.discussion_board_member_sessions.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        discussion_board_member_id: true,
        expired_at: true,
        created_at: true,
        updated_at: true,
        last_active_at: true,
        ip: true,
        headers: true,
      },
    });
  // Fetch total count for pagination
  const total = await MyGlobal.prisma.discussion_board_member_sessions.count({
    where: whereClause,
  });
  // Build response data
  const data = sessions.map((session) => {
    return {
      id: session.id as string & tags.Format<"uuid">,
      member: {
        id: session.discussion_board_member_id as string & tags.Format<"uuid">,
        email: "", // Fallback - in real implementation would fetch member data
        display_name: "", // Fallback - in real implementation would fetch member data
        is_active: true,
        is_admin: false,
        is_super_admin: false,
        created_at:
          toISOStringSafe(session.created_at) ?? new Date().toISOString(),
        updated_at:
          toISOStringSafe(session.updated_at) ?? new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ISummary,
      expiredAt:
        toISOStringSafe(session.expired_at) ?? new Date().toISOString(),
      createdAt:
        toISOStringSafe(session.created_at) ?? new Date().toISOString(),
      updatedAt:
        toISOStringSafe(session.updated_at) ?? new Date().toISOString(),
      lastActiveAt:
        toISOStringSafe(session.last_active_at) ?? new Date().toISOString(),
      ip: session.ip,
      headers: session.headers,
    };
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardMemberSession.ISummary;
}
