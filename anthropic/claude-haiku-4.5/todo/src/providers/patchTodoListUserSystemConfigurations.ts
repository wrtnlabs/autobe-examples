import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import { IPageITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListSystemConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserSystemConfigurations(props: {
  user: UserPayload;
  body: ITodoListSystemConfiguration.IRequest;
}): Promise<IPageITodoListSystemConfiguration> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition = {
    ...(props.body.search && {
      config_key: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.value_type && {
      value_type: props.body.value_type,
    }),
    ...(props.body.version && {
      version: props.body.version,
    }),
  };

  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";

  const orderByCondition = {
    [sortBy]: order,
  };

  const [configurations, total] = await Promise.all([
    MyGlobal.prisma.todo_list_system_config.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
    }),
    MyGlobal.prisma.todo_list_system_config.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: configurations.map((config) => ({
      id: config.id,
      config_key: config.config_key,
      config_value: config.config_value,
      value_type: typia.assert<"string" | "boolean" | "float" | "integer">(
        config.value_type,
      ),
      description: config.description ?? undefined,
      version: config.version,
      created_at: toISOStringSafe(config.created_at),
      updated_at: toISOStringSafe(config.updated_at),
    })),
  };
}
