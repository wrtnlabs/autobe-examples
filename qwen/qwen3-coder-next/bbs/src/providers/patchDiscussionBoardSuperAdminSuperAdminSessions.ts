import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSuperAdminSessions(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSuperAdminSession.IRequest;
}): Promise<IPageIDiscussionBoardSuperAdminSession> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build where clause from filter criteria
  const whereInput: Prisma.discussion_board_super_admin_sessionsWhereInput = {
    AND: [
      // Active status filter
      props.body.active !== undefined && props.body.active !== null
        ? { active: props.body.active }
        : {},
      // Created date range filter
      props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null
        ? { created_at: { gte: new Date(props.body.created_at_from) } }
        : {},
      props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null
        ? { created_at: { lte: new Date(props.body.created_at_to) } }
        : {},
      // Expired date range filter
      props.body.expired_at_from !== undefined &&
      props.body.expired_at_from !== null
        ? { expired_at: { gte: new Date(props.body.expired_at_from) } }
        : {},
      props.body.expired_at_to !== undefined &&
      props.body.expired_at_to !== null
        ? { expired_at: { lte: new Date(props.body.expired_at_to) } }
        : {},
      // Text search filters (partial matching)
      props.body.ip !== undefined && props.body.ip !== null
        ? { ip: { contains: props.body.ip } }
        : {},
      props.body.user_agent !== undefined && props.body.user_agent !== null
        ? { user_agent: { contains: props.body.user_agent } }
        : {},
      props.body.referrer !== undefined && props.body.referrer !== null
        ? { referrer: { contains: props.body.referrer } }
        : {},
    ].filter((condition) => Object.keys(condition).length > 0),
  };
  // Perform query with pagination
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_super_admin_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      include: {
        superAdmin: {
          select: {
            id: true,
            email: true,
            created_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_super_admin_sessions.count({
      where: whereInput,
    }),
  ]);
  // Transform database records to response format
  const data = sessions.map((session) => {
    return {
      id: session.id as string & tags.Format<"uuid">,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      ip: session.ip,
      user_agent: session.user_agent ?? null,
      referrer: session.referrer ?? null,
      active: session.active,
      created_at: session.created_at.toISOString() as string &
        tags.Format<"date-time">,
      expired_at: session.expired_at.toISOString() as string &
        tags.Format<"date-time">,
      updated_at: session.updated_at.toISOString() as string &
        tags.Format<"date-time">,
      superAdmin: {
        id: session.superAdmin.id as string & tags.Format<"uuid">,
        email: session.superAdmin.email,
        created_at: session.superAdmin.created_at.toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IDiscussionBoardSuperAdmin.ISummary,
    } satisfies IDiscussionBoardSuperAdminSession;
  });
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardSuperAdminSession;
}
