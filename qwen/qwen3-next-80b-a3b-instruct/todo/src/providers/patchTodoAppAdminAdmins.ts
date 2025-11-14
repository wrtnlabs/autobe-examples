import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { IPageITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminAdmins(props: {
  admin: AdminPayload;
  body: ITodoAppAdmin.IRequest;
}): Promise<IPageITodoAppAdmin.ISummary> {
  const {
    search,
    sort_by = "created_at",
    order = "asc",
    page = 1,
    limit = 100,
  } = props.body;

  // Build where clause safely without explicit typing
  const where: Prisma.todo_app_adminsWhereInput = {};

  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { id: search }, // Use exact match for UUID field since 'contains' is not allowed
    ];
  }

  // Ensure deleted_at is null (soft deleted)
  where.deleted_at = null;

  // Define order by based on allowed fields
  const orderBy: Record<string, "asc" | "desc"> = {};
  if (sort_by === "email") {
    orderBy.email = order;
  } else if (sort_by === "created_at") {
    orderBy.created_at = order;
  } else if (sort_by === "id") {
    orderBy.id = order;
  } else {
    orderBy.created_at = order;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Fetch data and count
  const [admins, total] = await Promise.all([
    MyGlobal.prisma.todo_app_admins.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.todo_app_admins.count({ where }),
  ]);

  // Map results to match response format and convert dates
  const mappedAdmins = admins.map((admin) => ({
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
  }));

  // Construct pagination object
  const pagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  };

  // Return formatted string as specified by IPageITodoAppAdmin.ISummary
  return JSON.stringify({
    data: mappedAdmins,
    pagination,
  });
}
