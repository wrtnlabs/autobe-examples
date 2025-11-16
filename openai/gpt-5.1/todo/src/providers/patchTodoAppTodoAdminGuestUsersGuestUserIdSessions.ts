import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";
import { IPageITodoAppGuestuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestuserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function patchTodoAppTodoAdminGuestUsersGuestUserIdSessions(props: {
  todoAdmin: TodoadminPayload;
  guestUserId: string & tags.Format<"uuid">;
  body: ITodoAppGuestUserSession.IRequest;
}): Promise<IPageITodoAppGuestuserSession.ISummary> {
  const pageInput = props.body.page;
  const limitInput = props.body.limit;

  const page = pageInput !== undefined && pageInput >= 1 ? pageInput : 1;
  const limit = limitInput !== undefined && limitInput > 0 ? limitInput : 50;

  const skip = (page - 1) * limit;

  const orderByField = (() => {
    if (
      props.body.order_by === "created_at" ||
      props.body.order_by === "expired_at"
    ) {
      return props.body.order_by;
    }
    return "created_at";
  })();

  const orderDirection = (() => {
    if (props.body.order_direction === undefined) return "desc";
    const lowered = props.body.order_direction.toLowerCase();
    if (lowered === "asc" || lowered === "desc") return lowered;
    return "desc";
  })();

  const createdAtFilter = (() => {
    const from = props.body.created_from;
    const to = props.body.created_to;

    if (from === undefined && to === undefined) return undefined;

    const range: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    } = {};
    if (from !== undefined) range.gte = from;
    if (to !== undefined) range.lte = to;
    return range;
  })();

  const expiredAtFilter = (() => {
    const from = props.body.expired_from;
    const to = props.body.expired_to;

    if (from === undefined && to === undefined) return undefined;

    const range: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    } = {};
    if (from !== undefined) range.gte = from;
    if (to !== undefined) range.lte = to;
    return range;
  })();

  const where = {
    todo_app_guestuser_id: props.guestUserId,
    ...(props.body.ip !== undefined && {
      ip: props.body.ip,
    }),
    ...(props.body.href !== undefined && {
      href: props.body.href,
    }),
    ...(props.body.referrer !== undefined && {
      referrer: props.body.referrer,
    }),
    ...(createdAtFilter !== undefined && {
      created_at: createdAtFilter,
    }),
    ...(expiredAtFilter !== undefined && {
      expired_at: expiredAtFilter,
    }),
  };

  // Load the parent guest user once; all sessions belong to this guest user.
  const guestUserRow = await MyGlobal.prisma.todo_app_guestusers.findUnique({
    where: {
      id: props.guestUserId,
    },
  });

  if (!guestUserRow) {
    throw new HttpException("Guest user not found", 404);
  }

  const guestUserSummary: ITodoAppGuestUser.ISummary = {
    id: guestUserRow.id as string & tags.Format<"uuid">,
    status: guestUserRow.status,
    created_at: toISOStringSafe(guestUserRow.created_at),
    updated_at: toISOStringSafe(guestUserRow.updated_at),
    external_reference:
      guestUserRow.external_reference === null
        ? undefined
        : guestUserRow.external_reference,
    display_name:
      guestUserRow.display_name === null
        ? undefined
        : guestUserRow.display_name,
  };

  const [rows, totalCount] = await Promise.all([
    MyGlobal.prisma.todo_app_guestuser_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [orderByField]: orderDirection,
      },
    }),
    MyGlobal.prisma.todo_app_guestuser_sessions.count({
      where,
    }),
  ]);

  const data: ITodoAppGuestUserSession.ISummary[] = rows.map((row) => {
    const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
      row.created_at,
    );

    const expiredAt: (string & tags.Format<"date-time">) | null | undefined =
      row.expired_at !== null ? toISOStringSafe(row.expired_at) : null;

    const summary: ITodoAppGuestUserSession.ISummary = {
      id: row.id as string & tags.Format<"uuid">,
      guestUser: guestUserSummary,
      ip: row.ip,
      href: row.href,
      referrer: row.referrer,
      created_at: createdAt,
      expired_at: expiredAt,
    };

    return summary;
  });

  const pages =
    totalCount === 0 || limit === 0 ? 0 : Math.ceil(totalCount / limit);

  const safeLimit = limit satisfies number as number;
  const safeCurrent = (page - 1) satisfies number as number;
  const safeRecords = totalCount satisfies number as number;
  const safePages = pages satisfies number as number;

  const pagination: IPage.IPagination = {
    current: safeCurrent as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: safeLimit as number & tags.Type<"int32"> & tags.Minimum<0>,
    records: safeRecords as number & tags.Type<"int32"> & tags.Minimum<0>,
    pages: safePages as number & tags.Type<"int32"> & tags.Minimum<0>,
  };

  return {
    pagination,
    data,
  };
}
