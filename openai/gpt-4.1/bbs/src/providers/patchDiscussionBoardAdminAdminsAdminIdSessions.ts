import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminAdminsAdminIdSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdminSession.IRequest;
}): Promise<IPageIDiscussionBoardAdminSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const offset = (page - 1) * limit;
  const sortBy = props.body.sort_by || "created_at";
  const order = props.body.order || "desc";

  const [sessions, count] = await Promise.all([
    MyGlobal.prisma.discussion_board_admin_sessions.findMany({
      where: { discussion_board_admin_id: props.adminId },
      orderBy: { [sortBy]: order },
      skip: offset,
      take: limit,
      include: {
        admin: true,
      },
    }),
    MyGlobal.prisma.discussion_board_admin_sessions.count({
      where: { discussion_board_admin_id: props.adminId },
    }),
  ]);

  const data = sessions.map((session) => ({
    id: session.id,
    admin: {
      id: session.admin.id,
      display_name: "",
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null || session.expired_at === undefined
        ? undefined
        : toISOStringSafe(session.expired_at),
  }));

  const pagination = {
    current: page,
    limit,
    records: count,
    pages: limit === 0 ? 0 : Math.ceil(count / limit),
  };

  return {
    pagination,
    data,
  };
}
