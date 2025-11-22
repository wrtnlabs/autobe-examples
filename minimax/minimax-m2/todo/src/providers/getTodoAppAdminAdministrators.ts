import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdministrator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminAdministrators(props: {
  admin: AdminPayload;
}): Promise<IPageITodoAppAdministrator.ISummary> {
  // Default pagination values
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_administrators.findMany({
      where: { deleted_at: null },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role_level: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.todo_app_administrators.count({
      where: { deleted_at: null },
    }),
  ]);

  const administrators: ITodoAppAdministrator.ISummary[] = data.map(
    (admin) => ({
      id: admin.id,
      email: admin.email,
      first_name: admin.first_name ?? "",
      last_name: admin.last_name ?? "",
      role_level: admin.role_level,
      created_at: toISOStringSafe(admin.created_at),
    }),
  );

  return {
    data: administrators,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
