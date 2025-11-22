import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import { IPageITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdministrator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminAdministrators(props: {
  admin: AdminPayload;
  body: ITodoAppAdministrator.IRequest;
}): Promise<IPageITodoAppAdministrator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build WHERE conditions with proper typing
  const whereConditions: any = {};

  // Handle soft deletion
  if (!props.body.include_deleted) {
    whereConditions.deleted_at = null;
  }

  // Role level filter
  if (props.body.role_level) {
    whereConditions.role_level = props.body.role_level;
  }

  // Status filter
  if (props.body.status) {
    whereConditions.status = props.body.status;
  }

  // Email filter (exact match)
  if (props.body.email) {
    whereConditions.email = props.body.email;
  }

  // First name filter (partial match)
  if (props.body.first_name) {
    whereConditions.first_name = { contains: props.body.first_name };
  }

  // Last name filter (partial match)
  if (props.body.last_name) {
    whereConditions.last_name = { contains: props.body.last_name };
  }

  // Date range filtering
  if (props.body.created_after || props.body.created_before) {
    whereConditions.created_at = {};
    if (props.body.created_after)
      whereConditions.created_at.gte = props.body.created_after;
    if (props.body.created_before)
      whereConditions.created_at.lte = props.body.created_before;
  }

  // Full-text search across name fields and email
  if (props.body.search) {
    whereConditions.OR = [
      { first_name: { contains: props.body.search } },
      { last_name: { contains: props.body.search } },
      { email: { contains: props.body.search } },
    ];
  }

  // Determine sort field and direction
  const orderByField = props.body.order_by || "created_at";
  const orderDirection = props.body.order_direction || "desc";
  const orderBy: Record<string, "asc" | "desc"> = {
    [orderByField]: orderDirection,
  };

  // Execute query with pagination
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_administrators.findMany({
      where: whereConditions,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role_level: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_app_administrators.count({
      where: whereConditions,
    }),
  ]);

  // Map results to response format - filter out records with null names
  const results = data
    .filter((admin) => admin.first_name !== null && admin.last_name !== null)
    .map((admin) => ({
      id: admin.id as string & tags.Format<"uuid">,
      email: admin.email,
      first_name: admin.first_name as string,
      last_name: admin.last_name as string,
      role_level: admin.role_level,
      created_at: toISOStringSafe(admin.created_at),
    }));

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const currentPage = page;

  return {
    data: results,
    pagination: {
      current: currentPage,
      limit: limit,
      records: total,
      pages: totalPages,
    },
  };
}
