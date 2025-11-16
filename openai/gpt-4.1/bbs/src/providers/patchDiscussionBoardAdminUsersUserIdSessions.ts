import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IPageIDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminUsersUserIdSessions(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUserSession.IRequest;
}): Promise<IPageIDiscussionBoardUserSession.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 100;
  const skip = (page - 1) * pageSize;

  const where = {
    discussion_board_user_id: props.userId,
    ...(props.body.createdFrom && {
      created_at: { gte: props.body.createdFrom },
    }),
    ...(props.body.createdTo && {
      created_at: {
        ...(props.body.createdFrom && { gte: props.body.createdFrom }),
        lte: props.body.createdTo,
      },
    }),
    ...(props.body.expired === true && {
      expired_at: { not: null },
    }),
    ...(props.body.expired === false && {
      expired_at: null,
    }),
    ...(props.body.ip && { ip: props.body.ip }),
  };

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_user_sessions.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.discussion_board_user_sessions.count({ where }),
  ]);

  const data = sessions.map((session) => ({
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null
        ? undefined
        : toISOStringSafe(session.expired_at),
  }));

  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data,
  };
}
