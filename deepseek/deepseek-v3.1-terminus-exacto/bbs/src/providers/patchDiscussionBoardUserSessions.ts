import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardUserSessionAtSummaryTransformer } from "../transformers/DiscussionBoardUserSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserSessions(props: {
  user: UserPayload;
  body: IDiscussionBoardUserSession.IRequest;
}): Promise<IPageIDiscussionBoardUserSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build base WHERE conditions that apply to all session types
  const baseWhereConditions = {
    ...(props.body.created_at_from && {
      created_at: {
        gte: toISOStringSafe(new Date(props.body.created_at_from)),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: toISOStringSafe(new Date(props.body.created_at_to)) },
    }),
    ...(props.body.last_accessed_at_from && {
      last_accessed_at: {
        gte: toISOStringSafe(new Date(props.body.last_accessed_at_from)),
      },
    }),
    ...(props.body.last_accessed_at_to && {
      last_accessed_at: {
        lte: toISOStringSafe(new Date(props.body.last_accessed_at_to)),
      },
    }),
    ...(props.body.ip_pattern && {
      ip: { contains: props.body.ip_pattern.replace(/%/g, "") },
    }),
    ...(props.body.user_agent_search && {
      user_agent: { contains: props.body.user_agent_search.replace(/%/g, "") },
    }),
  };
  // Query user sessions if session_type is 'user' or null
  const userSessions =
    props.body.session_type === "user" || props.body.session_type === null
      ? await MyGlobal.prisma.discussion_board_user_sessions.findMany({
          where: {
            ...baseWhereConditions,
            user: { deleted_at: null },
          },
          skip,
          take: limit,
          orderBy: { created_at: "desc" },
          ...DiscussionBoardUserSessionAtSummaryTransformer.select(),
        })
      : [];
  // Query admin sessions if session_type is 'admin' or null
  const adminSessions =
    props.body.session_type === "admin" || props.body.session_type === null
      ? await MyGlobal.prisma.discussion_board_admin_sessions.findMany({
          where: {
            ...baseWhereConditions,
            admin: { deleted_at: null },
          },
          skip,
          take: limit,
          orderBy: { created_at: "desc" },
          select: {
            id: true,
            ip: true,
            user_agent: true,
            referrer: true,
            created_at: true,
            expired_at: true,
            last_accessed_at: true,
            admin: {
              select: {
                id: true,
                display_name: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        })
      : [];
  // Query super admin sessions if session_type is 'super_admin' or null
  const superAdminSessions =
    props.body.session_type === "super_admin" ||
    props.body.session_type === null
      ? await MyGlobal.prisma.discussion_board_super_admin_sessions.findMany({
          where: {
            ...baseWhereConditions,
            superAdmin: { deleted_at: null },
          },
          skip,
          take: limit,
          orderBy: { created_at: "desc" },
          select: {
            id: true,
            ip: true,
            created_at: true,
            expired_at: true,
            superAdmin: {
              select: {
                id: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        })
      : [];
  // Transform user sessions
  const transformedUserSessions = await Promise.all(
    userSessions.map((session) =>
      DiscussionBoardUserSessionAtSummaryTransformer.transform(session),
    ),
  );
  // Transform admin sessions manually
  const transformedAdminSessions = adminSessions.map((session) => ({
    id: session.id,
    ip: session.ip,
    user_agent: session.user_agent,
    referrer: session.referrer ?? undefined,
    created_at: toISOStringSafe(session.created_at),
    expired_at: toISOStringSafe(session.expired_at),
    last_accessed_at: toISOStringSafe(session.last_accessed_at),
    user: {
      id: session.admin.id,
      display_name: session.admin.display_name,
      bio: null,
      created_at: toISOStringSafe(session.admin.created_at),
      updated_at: toISOStringSafe(session.admin.updated_at),
    },
  }));
  // Transform super admin sessions manually
  const transformedSuperAdminSessions = superAdminSessions.map((session) => ({
    id: session.id,
    ip: session.ip,
    user_agent: "",
    referrer: undefined,
    created_at: toISOStringSafe(session.created_at),
    expired_at: toISOStringSafe(session.expired_at),
    last_accessed_at: toISOStringSafe(session.created_at),
    user: {
      id: session.superAdmin.id,
      display_name: "",
      bio: null,
      created_at: toISOStringSafe(session.superAdmin.created_at),
      updated_at: toISOStringSafe(session.superAdmin.updated_at),
    },
  }));
  // Combine all sessions
  const allSessions = [
    ...transformedUserSessions,
    ...transformedAdminSessions,
    ...transformedSuperAdminSessions,
  ];
  // Get total counts
  const userTotal =
    props.body.session_type === "user" || props.body.session_type === null
      ? await MyGlobal.prisma.discussion_board_user_sessions.count({
          where: {
            ...baseWhereConditions,
            user: { deleted_at: null },
          },
        })
      : 0;
  const adminTotal =
    props.body.session_type === "admin" || props.body.session_type === null
      ? await MyGlobal.prisma.discussion_board_admin_sessions.count({
          where: {
            ...baseWhereConditions,
            admin: { deleted_at: null },
          },
        })
      : 0;
  const superAdminTotal =
    props.body.session_type === "super_admin" ||
    props.body.session_type === null
      ? await MyGlobal.prisma.discussion_board_super_admin_sessions.count({
          where: {
            ...baseWhereConditions,
            superAdmin: { deleted_at: null },
          },
        })
      : 0;
  const total = userTotal + adminTotal + superAdminTotal;
  return {
    data: allSessions,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
