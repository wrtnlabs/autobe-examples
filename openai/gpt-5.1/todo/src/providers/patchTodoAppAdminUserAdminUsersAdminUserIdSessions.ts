import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminuserSession";
import { IPageITodoAppAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminuserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchTodoAppAdminUserAdminUsersAdminUserIdSessions(props: {
  adminUser: AdminuserPayload;
  adminUserId: string & tags.Format<"uuid">;
  body: ITodoAppAdminuserSession.IRequest;
}): Promise<IPageITodoAppAdminuserSession.ISummary> {
  // Ensure the authenticated admin can only view their own sessions
  if (props.adminUser.id !== props.adminUserId) {
    throw new HttpException(
      "Forbidden: cannot access sessions of another admin user",
      403,
    );
  }

  // Verify that the target admin user exists and is not soft-deleted
  const targetAdminUser = await MyGlobal.prisma.todo_app_adminusers.findFirst({
    where: {
      id: props.adminUserId,
      deleted_at: null,
    },
  });

  if (targetAdminUser === null) {
    throw new HttpException("Admin user not found", 404);
  }

  const pageBody = props.body.page;
  const limitBody = props.body.limit;

  const page: number =
    pageBody !== undefined && pageBody !== null && pageBody > 0 ? pageBody : 1;
  const limit: number =
    limitBody !== undefined && limitBody !== null && limitBody > 0
      ? limitBody
      : 20;

  const skip: number = (page - 1) * limit;

  const createdAtFilter = (() => {
    if (
      (props.body.from_created_at === undefined ||
        props.body.from_created_at === null) &&
      (props.body.to_created_at === undefined ||
        props.body.to_created_at === null)
    ) {
      return undefined;
    }

    const condition: {
      gte?: Date;
      lte?: Date;
    } = {};

    if (
      props.body.from_created_at !== undefined &&
      props.body.from_created_at !== null
    ) {
      condition.gte = new Date(props.body.from_created_at);
    }

    if (
      props.body.to_created_at !== undefined &&
      props.body.to_created_at !== null
    ) {
      condition.lte = new Date(props.body.to_created_at);
    }

    return condition;
  })();

  const where: Prisma.todo_app_adminuser_sessionsWhereInput = {
    todo_app_adminuser_id: props.adminUserId,
    ...(createdAtFilter !== undefined
      ? {
          created_at: createdAtFilter,
        }
      : {}),
    ...(props.body.only_active === true
      ? {
          expired_at: null,
        }
      : {}),
  };

  const orderBy: Prisma.todo_app_adminuser_sessionsOrderByWithRelationInput = {
    created_at: props.body.sort_created_at_desc === false ? "asc" : "desc",
  };

  const [sessions, totalCount] = await Promise.all([
    MyGlobal.prisma.todo_app_adminuser_sessions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        adminUser: true,
      },
    }),
    MyGlobal.prisma.todo_app_adminuser_sessions.count({
      where,
    }),
  ]);

  const data: ITodoAppAdminuserSession.ISummary[] = sessions.map((session) => {
    const adminUserSummary: ITodoAppAdminUser.ISummary = {
      id: session.adminUser.id,
      email: session.adminUser.email,
      display_name:
        session.adminUser.display_name === null
          ? null
          : session.adminUser.display_name,
      status: session.adminUser.status,
      last_login_at:
        session.adminUser.last_login_at === null
          ? null
          : toISOStringSafe(session.adminUser.last_login_at),
      created_at: toISOStringSafe(session.adminUser.created_at),
      updated_at: toISOStringSafe(session.adminUser.updated_at),
    };

    const summary: ITodoAppAdminuserSession.ISummary = {
      id: session.id,
      todo_app_adminuser_id: session.todo_app_adminuser_id,
      adminUser: adminUserSummary,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at:
        session.expired_at === null
          ? null
          : toISOStringSafe(session.expired_at),
    };

    return summary;
  });

  const records: number = totalCount;
  const pages: number = records === 0 ? 0 : Math.ceil(records / limit);

  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records,
    pages,
  };

  return {
    pagination,
    data,
  };
}
