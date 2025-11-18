import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import { IPageITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberuser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchTodoAppAdminUserMemberUsers(props: {
  adminUser: AdminuserPayload;
  body: ITodoAppMemberuser.IRequest;
}): Promise<IPageITodoAppMemberuser.ISummary> {
  const page: number =
    props.body.page !== undefined && props.body.page > 0 ? props.body.page : 1;
  const limit: number =
    props.body.limit !== undefined && props.body.limit > 0
      ? props.body.limit
      : 20;

  const skip: number = (page - 1) * limit;

  const where = (() => {
    const conditions: Record<string, unknown> = {};

    // Email partial match (case-insensitive)
    if (props.body.email !== undefined) {
      conditions.email = {
        contains: props.body.email,
        mode: "insensitive",
      };
    }

    // Status equality
    if (props.body.status !== undefined) {
      conditions.status = props.body.status;
    }

    // Deleted flag handling based on deleted_at field
    if (props.body.deleted === true) {
      // Include both active and logically deleted accounts: no deleted_at condition
    } else {
      // Default: only not-deleted accounts
      conditions.deleted_at = null;
    }

    // Created_at range
    if (
      props.body.createdFrom !== undefined ||
      props.body.createdTo !== undefined
    ) {
      const createdAtFilter: Record<string, string> = {};
      if (props.body.createdFrom !== undefined) {
        createdAtFilter.gte = props.body.createdFrom;
      }
      if (props.body.createdTo !== undefined) {
        createdAtFilter.lte = props.body.createdTo;
      }
      conditions.created_at = createdAtFilter;
    }

    return conditions;
  })();

  const orderBy = (() => {
    const direction: "asc" | "desc" =
      props.body.orderDirection === "asc" ? "asc" : "desc";

    const field = props.body.orderBy;

    if (field === "email") {
      return { email: direction };
    }
    if (field === "status") {
      return { status: direction };
    }
    if (field === "last_login_at") {
      return { last_login_at: direction };
    }

    // Default ordering: created_at
    return { created_at: direction };
  })();

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_memberusers.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_app_memberusers.count({
      where,
    }),
  ]);

  const data: ITodoAppMemberuser.ISummary[] = rows.map((row) => {
    const summary: ITodoAppMemberuser.ISummary = {
      id: row.id,
      email: row.email,
      status: row.status,
    };

    if (row.display_name !== null) {
      summary.display_name = row.display_name;
    } else {
      summary.display_name = null;
    }

    if (row.last_login_at !== null) {
      summary.last_login_at = toISOStringSafe(row.last_login_at);
    } else {
      summary.last_login_at = null;
    }

    return summary;
  });

  const pages: number = limit === 0 ? 0 : Math.ceil(total / limit);

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
