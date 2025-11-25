import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUserSession";
import { IPageITodoAppAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminuserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchTodoAppAdminUserAdminUsersAdminUserIdSessions(props: {
  adminUser: AdminuserPayload;
  adminUserId: string & tags.Format<"uuid">;
  body: ITodoAppAdminUserSession.IRequest;
}): Promise<IPageITodoAppAdminuserSession.ISummary> {
  // Ensure the authenticated admin user matches the target admin user in the path
  if (props.adminUser.id !== props.adminUserId) {
    throw new HttpException("Forbidden", 403);
  }

  const page = props.body.page !== undefined ? props.body.page : 1;
  const limit = props.body.limit !== undefined ? props.body.limit : 100;

  const skip = (page - 1) * limit;

  const orderDirection =
    props.body.orderByCreatedAt !== undefined
      ? props.body.orderByCreatedAt
      : "desc";

  const whereCondition = {
    todo_app_adminuser_id: props.adminUserId,
    ...(props.body.ip !== undefined && props.body.ip !== null
      ? { ip: props.body.ip }
      : {}),
    ...(() => {
      const createdAtCondition: { gte?: string; lte?: string } = {};

      if (
        props.body.fromCreatedAt !== undefined &&
        props.body.fromCreatedAt !== null
      ) {
        createdAtCondition.gte = props.body.fromCreatedAt;
      }

      if (
        props.body.toCreatedAt !== undefined &&
        props.body.toCreatedAt !== null
      ) {
        createdAtCondition.lte = props.body.toCreatedAt;
      }

      if (Object.keys(createdAtCondition).length === 0) {
        return {};
      }

      return { created_at: createdAtCondition };
    })(),
  };

  // Verify that the target admin user exists
  const adminUserRow = await MyGlobal.prisma.todo_app_adminusers.findUnique({
    where: {
      id: props.adminUserId,
    },
  });

  if (adminUserRow === null) {
    throw new HttpException("Admin user not found", 404);
  }

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_app_adminuser_sessions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: {
        created_at: orderDirection,
      },
    }),
    MyGlobal.prisma.todo_app_adminuser_sessions.count({
      where: whereCondition,
    }),
  ]);

  const adminUserSummary: ITodoAppAdminUser.ISummary = {
    id: adminUserRow.id,
    email: adminUserRow.email,
    display_name: adminUserRow.display_name,
    status: adminUserRow.status,
    created_at: toISOStringSafe(adminUserRow.created_at),
    updated_at: toISOStringSafe(adminUserRow.updated_at),
  };

  const data: ITodoAppAdminUserSession.ISummary[] = sessions.map((session) => {
    const expiredAtValue = session.expired_at;

    const convertedExpiredAt =
      expiredAtValue === null ? undefined : toISOStringSafe(expiredAtValue);

    return {
      id: session.id,
      adminUser: adminUserSummary,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: convertedExpiredAt,
    };
  });

  const pages = limit === 0 ? 0 : Math.ceil(total / limit);

  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: total,
    pages,
  };

  return {
    pagination,
    data,
  };
}
