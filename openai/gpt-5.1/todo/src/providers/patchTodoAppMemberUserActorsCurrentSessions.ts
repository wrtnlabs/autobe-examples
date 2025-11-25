import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSession";
import { IPageITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function patchTodoAppMemberUserActorsCurrentSessions(props: {
  memberUser: MemberuserPayload;
  body: ITodoAppSession.IRequest;
}): Promise<IPageITodoAppSession.ISummary> {
  const memberUserId = props.memberUser.id;
  const page = props.body.page;
  const limit = props.body.limit;

  const skip = page * limit;
  const take = limit;

  const where = (() => {
    const base: Prisma.todo_app_memberuser_sessionsWhereInput = {
      todo_app_memberuser_id: memberUserId,
    };

    if (props.body.ip !== undefined && props.body.ip !== null) {
      base.ip = props.body.ip;
    }

    if (
      (props.body.createdFrom !== undefined &&
        props.body.createdFrom !== null) ||
      (props.body.createdTo !== undefined && props.body.createdTo !== null)
    ) {
      base.created_at = {};
      if (
        props.body.createdFrom !== undefined &&
        props.body.createdFrom !== null
      ) {
        base.created_at.gte = props.body.createdFrom;
      }
      if (props.body.createdTo !== undefined && props.body.createdTo !== null) {
        base.created_at.lte = props.body.createdTo;
      }
    }

    const hasExpiredRangeFilter =
      (props.body.expiredFrom !== undefined &&
        props.body.expiredFrom !== null) ||
      (props.body.expiredTo !== undefined && props.body.expiredTo !== null);

    if (hasExpiredRangeFilter) {
      base.expired_at = {};
      if (
        props.body.expiredFrom !== undefined &&
        props.body.expiredFrom !== null
      ) {
        base.expired_at.gte = props.body.expiredFrom;
      }
      if (props.body.expiredTo !== undefined && props.body.expiredTo !== null) {
        base.expired_at.lte = props.body.expiredTo;
      }
    } else if (props.body.activeOnly === true) {
      // Active sessions: interpret as expired_at is null when no explicit expired range is given.
      base.expired_at = null;
    }

    return base;
  })();

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_app_memberuser_sessions.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_app_memberuser_sessions.count({
      where,
    }),
  ]);

  const data: ITodoAppSession.ISummary[] = sessions.map((session) => {
    const createdAt = toISOStringSafe(session.created_at);
    const expiredAt =
      session.expired_at !== null ? toISOStringSafe(session.expired_at) : null;

    const summary: ITodoAppSession.ISummary = {
      id: session.id,
      actor_type: "member",
      actor_id: session.todo_app_memberuser_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: createdAt,
      expired_at: expiredAt,
    };

    return summary;
  });

  const pages = limit === 0 ? 0 : Math.ceil(total / limit);

  const pagination: IPage.IPagination = {
    current: page satisfies number as number,
    limit: limit satisfies number as number,
    records: total,
    pages,
  };

  return {
    pagination,
    data,
  };
}
