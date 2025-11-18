import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserSession";
import { IPageITodoAppMemberUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchTodoAppAdminUserMemberUsersMemberUserIdSessions(props: {
  adminUser: AdminuserPayload;
  memberUserId: string & tags.Format<"uuid">;
  body: ITodoAppMemberUserSession.IRequest;
}): Promise<IPageITodoAppMemberUserSession.ISummary> {
  // 1. Ensure the target member user exists
  const memberUser = await MyGlobal.prisma.todo_app_memberusers.findFirst({
    where: {
      id: props.memberUserId,
    },
  });

  if (memberUser === null) {
    throw new HttpException("Member user not found", 404);
  }

  // 2. Pagination and ordering defaults
  const page: number = props.body.page !== undefined ? props.body.page : 1;
  const rawLimit: number =
    props.body.limit !== undefined ? props.body.limit : 20;
  const limit: number = rawLimit > 100 ? 100 : rawLimit;
  const skip: number = (page - 1) * limit;

  const orderByField: string =
    props.body.orderBy !== undefined && props.body.orderBy !== null
      ? props.body.orderBy
      : "created_at";

  const orderDirectionRaw: string =
    props.body.orderDirection !== undefined &&
    props.body.orderDirection !== null
      ? props.body.orderDirection
      : "desc";

  const orderDirection: "asc" | "desc" =
    orderDirectionRaw === "asc" ? "asc" : "desc";

  // Only allow known sortable fields to prevent invalid column names
  const sortableField: "created_at" | "expired_at" =
    orderByField === "expired_at" ? "expired_at" : "created_at";

  // 3. Query sessions and total count concurrently
  const whereCondition = {
    todo_app_memberuser_id: props.memberUserId,
  };

  const [sessions, totalCount] = await Promise.all([
    MyGlobal.prisma.todo_app_memberuser_sessions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: {
        [sortableField]: orderDirection,
      },
    }),
    MyGlobal.prisma.todo_app_memberuser_sessions.count({
      where: whereCondition,
    }),
  ]);

  // 4. Map member user summary once
  const memberUserSummary: ITodoAppMemberUser.ISummary = {
    id: memberUser.id,
    email: memberUser.email,
    display_name:
      memberUser.display_name === null ? null : memberUser.display_name,
    status: memberUser.status,
    created_at: toISOStringSafe(memberUser.created_at),
  };

  // 5. Map session summaries
  const data: ITodoAppMemberUserSession.ISummary[] = sessions.map((session) => {
    const expiredAtValue =
      session.expired_at === null ? null : toISOStringSafe(session.expired_at);

    const summary: ITodoAppMemberUserSession.ISummary = {
      id: session.id,
      memberUser: memberUserSummary,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
    };

    // expired_at is optional and nullable; include it explicitly with null when appropriate
    summary.expired_at = expiredAtValue;

    return summary;
  });

  // 6. Build pagination metadata
  const pages: number = totalCount === 0 ? 0 : Math.ceil(totalCount / limit);

  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: totalCount,
    pages,
  };

  return {
    pagination,
    data,
  };
}
