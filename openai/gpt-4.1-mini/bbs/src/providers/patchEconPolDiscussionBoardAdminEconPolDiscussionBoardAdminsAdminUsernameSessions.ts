import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdminSession";
import { IPageIEconPolDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPolDiscussionBoardAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchEconPolDiscussionBoardAdminEconPolDiscussionBoardAdminsAdminUsernameSessions(props: {
  admin: AdminPayload;
  adminUsername: string;
  body: IEconPolDiscussionBoardAdminSession.IRequest;
}): Promise<IPageIEconPolDiscussionBoardAdminSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const admin =
    await MyGlobal.prisma.econ_pol_discussion_board_admins.findUnique({
      where: { username: props.adminUsername, deleted_at: null },
    });

  if (!admin) {
    throw new HttpException("Administrator not found", 404);
  }

  const sessionWhere: Prisma.econ_pol_discussion_board_admin_sessionsWhereInput =
    {
      econ_pol_discussion_board_admin_id: admin.id,
    };

  if (props.body.ip_address === null) {
    // no filter
  } else if (props.body.ip_address !== undefined) {
    sessionWhere.ip = props.body.ip_address;
  }

  const createdAtFilter: {
    gte?: (string & tags.Format<"date-time">) | undefined;
    lte?: (string & tags.Format<"date-time">) | undefined;
  } = {};

  if (props.body.date_from !== null && props.body.date_from !== undefined) {
    createdAtFilter.gte = toISOStringSafe(props.body.date_from);
  }

  if (props.body.date_to !== null && props.body.date_to !== undefined) {
    createdAtFilter.lte = toISOStringSafe(props.body.date_to);
  }

  if (Object.keys(createdAtFilter).length > 0) {
    sessionWhere.created_at = createdAtFilter;
  }

  const orderByField = props.body.sort_by ?? "created_at";
  const orderDirection = props.body.order ?? "desc";

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.econ_pol_discussion_board_admin_sessions.findMany({
      where: sessionWhere,
      skip,
      take: limit,
      orderBy: { [orderByField]: orderDirection },
    }),
    MyGlobal.prisma.econ_pol_discussion_board_admin_sessions.count({
      where: sessionWhere,
    }),
  ]);

  return {
    data: sessions.map((session) => ({
      id: session.id,
      econ_pol_discussion_board_admin_id:
        session.econ_pol_discussion_board_admin_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at) as string &
        tags.Format<"date-time">,
      expired_at:
        session.expired_at !== null && session.expired_at !== undefined
          ? (toISOStringSafe(session.expired_at) as string &
              tags.Format<"date-time">)
          : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
