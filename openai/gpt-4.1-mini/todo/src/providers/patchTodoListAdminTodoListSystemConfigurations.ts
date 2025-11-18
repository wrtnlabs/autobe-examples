import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListSystemConfiguration";
import { IPageITodoListTodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodoListSystemConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminTodoListSystemConfigurations(props: {
  admin: AdminPayload;
  body: ITodoListTodoListSystemConfiguration.IRequest;
}): Promise<IPageITodoListTodoListSystemConfiguration.ISummary> {
  const page = (props.body.page ?? 1) satisfies number as number;
  const limit = (props.body.limit ?? 100) satisfies number as number;
  const skip = (page - 1) * limit;

  const where = {
    AND: [
      {
        OR: [
          {
            key: {
              contains: props.body.search ?? undefined,
              mode: "insensitive" as const,
            },
          },
          {
            value: {
              contains: props.body.search ?? undefined,
              mode: "insensitive" as const,
            },
          },
        ],
      },
    ],
  };

  const orderColumn = props.body.orderBy || "id";
  const orderDirection = props.body.orderDirection || "asc";

  const orderBy = {
    [orderColumn]: orderDirection as "asc" | "desc",
  };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.todo_list_system_configurations.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_system_configurations.count({
      where,
    }),
  ]);

  return {
    data: records.map((record) => ({
      id: record.id,
      key: record.key,
      value: record.value,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
