import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppActorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppActorSession";
import { IPageITodoAppActorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppActorSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function patchTodoAppTodoAdminActorsSessions(props: {
  todoAdmin: TodoadminPayload;
  body: ITodoAppActorSession.IRequest;
}): Promise<IPageITodoAppActorSession.ISummary> {
  const page = props.body.page !== undefined ? props.body.page : 1;
  const limit = props.body.limit !== undefined ? props.body.limit : 20;

  const actorTypeFilter = props.body.actor_type;
  const actorIdFilter = props.body.actor_id;
  const ipFilter = props.body.ip;
  const createdFromFilter = props.body.created_from;
  const createdToFilter = props.body.created_to;

  const skip = (page - 1) * limit;

  const buildCreatedAtCondition = () => {
    if (createdFromFilter === undefined && createdToFilter === undefined) {
      return undefined;
    }

    const range: { gte?: string; lte?: string } = {};

    if (createdFromFilter !== undefined) {
      range.gte = createdFromFilter;
    }
    if (createdToFilter !== undefined) {
      range.lte = createdToFilter;
    }

    return range;
  };

  const createdAtCondition = buildCreatedAtCondition();

  const buildAdminWhere = () => {
    const where: {
      todo_admin_id?: string;
      ip?: string;
      created_at?: { gte?: string; lte?: string };
    } = {};

    if (actorIdFilter !== undefined) {
      where.todo_admin_id = actorIdFilter;
    }
    if (ipFilter !== undefined) {
      where.ip = ipFilter;
    }
    if (createdAtCondition !== undefined) {
      where.created_at = createdAtCondition;
    }

    return where;
  };

  const buildUserWhere = () => {
    const where: {
      todo_user_id?: string;
      ip?: string;
      created_at?: { gte?: string; lte?: string };
    } = {};

    if (actorIdFilter !== undefined) {
      where.todo_user_id = actorIdFilter;
    }
    if (ipFilter !== undefined) {
      where.ip = ipFilter;
    }
    if (createdAtCondition !== undefined) {
      where.created_at = createdAtCondition;
    }

    return where;
  };

  const buildGuestWhere = () => {
    const where: {
      guestuser_id?: string;
      ip?: string;
      created_at?: { gte?: string; lte?: string };
    } = {};

    if (actorIdFilter !== undefined) {
      where.guestuser_id = actorIdFilter;
    }
    if (ipFilter !== undefined) {
      where.ip = ipFilter;
    }
    if (createdAtCondition !== undefined) {
      where.created_at = createdAtCondition;
    }

    return where;
  };

  const includeAdmin =
    actorTypeFilter === undefined || actorTypeFilter === "admin";
  const includeUser =
    actorTypeFilter === undefined || actorTypeFilter === "user";
  const includeGuest =
    actorTypeFilter === undefined || actorTypeFilter === "guest";

  const takeForPerTableQuery =
    actorTypeFilter === undefined ? page * limit : limit;

  type CombinedSession = {
    id: string;
    actorType: "admin" | "user" | "guest";
    actor:
      | ITodoAppTodoAdmin.ISummary
      | ITodoAppTodoUser.ISummary
      | ITodoAppGuestUser.ISummary;
    ip: string;
    href: string;
    referrer: string;
    created_at: string;
    expired_at: string | null;
  };

  const queries: Array<
    Promise<{ total: number; sessions: CombinedSession[] }>
  > = [];

  if (includeAdmin) {
    queries.push(
      (async () => {
        const where = buildAdminWhere();
        const [total, rows] = await Promise.all([
          MyGlobal.prisma.todo_app_todoadmin_sessions.count({ where }),
          MyGlobal.prisma.todo_app_todoadmin_sessions.findMany({
            where,
            orderBy: { created_at: "desc" },
            skip: actorTypeFilter === "admin" ? skip : 0,
            take: takeForPerTableQuery,
            include: {
              todoAdmin: true,
            },
          }),
        ]);

        const sessions: CombinedSession[] = rows.map((row) => {
          const admin = row.todoAdmin;

          const adminSummary: ITodoAppTodoAdmin.ISummary = {
            id: admin.id,
            email: admin.email,
            display_name:
              admin.display_name === null ? undefined : admin.display_name,
            status: admin.status,
            last_login_at:
              admin.last_login_at === null
                ? undefined
                : toISOStringSafe(admin.last_login_at),
            created_at: toISOStringSafe(admin.created_at),
            updated_at: toISOStringSafe(admin.updated_at),
          };

          return {
            id: row.id,
            actorType: "admin",
            actor: adminSummary,
            ip: row.ip,
            href: row.href,
            referrer: row.referrer,
            created_at: toISOStringSafe(row.created_at),
            expired_at:
              row.expired_at === null ? null : toISOStringSafe(row.expired_at),
          };
        });

        return { total, sessions };
      })(),
    );
  }

  if (includeUser) {
    queries.push(
      (async () => {
        const where = buildUserWhere();
        const [total, rows] = await Promise.all([
          MyGlobal.prisma.todo_app_todouser_sessions.count({ where }),
          MyGlobal.prisma.todo_app_todouser_sessions.findMany({
            where,
            orderBy: { created_at: "desc" },
            skip: actorTypeFilter === "user" ? skip : 0,
            take: takeForPerTableQuery,
            include: {
              todoUser: true,
            },
          }),
        ]);

        const sessions: CombinedSession[] = rows.map((row) => {
          const user = row.todoUser;

          const userSummary: ITodoAppTodoUser.ISummary = {
            id: user.id,
            email: user.email,
            display_name:
              user.display_name === null ? undefined : user.display_name,
            status: user.status,
            created_at: toISOStringSafe(user.created_at),
          };

          return {
            id: row.id,
            actorType: "user",
            actor: userSummary,
            ip: row.ip,
            href: row.href,
            referrer: row.referrer,
            created_at: toISOStringSafe(row.created_at),
            expired_at:
              row.expired_at === null ? null : toISOStringSafe(row.expired_at),
          };
        });

        return { total, sessions };
      })(),
    );
  }

  if (includeGuest) {
    queries.push(
      (async () => {
        const where = buildGuestWhere();
        const [total, rows] = await Promise.all([
          MyGlobal.prisma.todo_app_guestuser_sessions.count({ where }),
          MyGlobal.prisma.todo_app_guestuser_sessions.findMany({
            where,
            orderBy: { created_at: "desc" },
            skip: actorTypeFilter === "guest" ? skip : 0,
            take: takeForPerTableQuery,
            include: {
              guestUser: true,
            },
          }),
        ]);

        const sessions: CombinedSession[] = rows.map((row) => {
          const guest = row.guestUser;

          const guestSummary: ITodoAppGuestUser.ISummary = {
            id: guest.id,
            external_reference:
              guest.external_reference === null
                ? null
                : guest.external_reference,
            display_name:
              guest.display_name === null ? null : guest.display_name,
            status: guest.status,
            created_at: toISOStringSafe(guest.created_at),
            updated_at: toISOStringSafe(guest.updated_at),
          };

          return {
            id: row.id,
            actorType: "guest",
            actor: guestSummary,
            ip: row.ip,
            href: row.href,
            referrer: row.referrer,
            created_at: toISOStringSafe(row.created_at),
            expired_at:
              row.expired_at === null ? null : toISOStringSafe(row.expired_at),
          };
        });

        return { total, sessions };
      })(),
    );
  }

  const results = await Promise.all(queries);

  let totalRecords = 0;
  const combinedSessions: CombinedSession[] = [];

  for (const result of results) {
    totalRecords += result.total;
    for (const session of result.sessions) {
      combinedSessions.push(session);
    }
  }

  combinedSessions.sort((a, b) => {
    if (a.created_at === b.created_at) return 0;
    return a.created_at < b.created_at ? 1 : -1;
  });

  const slicedSessions =
    actorTypeFilter === undefined
      ? combinedSessions.slice(skip, skip + limit)
      : combinedSessions.slice(0, limit);

  const responseSessions: ITodoAppActorSession.ISummary[] = slicedSessions.map(
    (session) => ({
      id: session.id,
      actorType: session.actorType,
      actor: session.actor,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: session.created_at,
      expired_at: session.expired_at === null ? null : session.expired_at,
    }),
  );

  const pagination: IPage.IPagination = {
    current: totalRecords === 0 ? 0 : page - 1,
    limit,
    records: totalRecords,
    pages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit),
  };

  return {
    pagination,
    data: responseSessions,
  };
}
