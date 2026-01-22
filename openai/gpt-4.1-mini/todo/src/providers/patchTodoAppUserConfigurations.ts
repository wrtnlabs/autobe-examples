import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import { IPageITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserConfigurations(props: {
  user: UserPayload;
  body: ITodoAppConfiguration.IRequest;
}): Promise<IPageITodoAppConfiguration.ISummary> {
  const page = (props.body.offset ?? 0) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (props.body.limit ?? 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const whereInput = {
    ...(props.body.key ? { key: { contains: props.body.key } } : {}),
    ...(props.body.value ? { value: { contains: props.body.value } } : {}),
    description:
      props.body.description === null
        ? null
        : props.body.description
          ? { contains: props.body.description }
          : undefined,
    ...(props.body.created_at_from || props.body.created_at_to
      ? {
          created_at: {
            ...(props.body.created_at_from
              ? { gte: props.body.created_at_from }
              : {}),
            ...(props.body.created_at_to
              ? { lte: props.body.created_at_to }
              : {}),
          },
        }
      : {}),
    ...(props.body.updated_at_from || props.body.updated_at_to
      ? {
          updated_at: {
            ...(props.body.updated_at_from
              ? { gte: props.body.updated_at_from }
              : {}),
            ...(props.body.updated_at_to
              ? { lte: props.body.updated_at_to }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.todo_app_configurationsWhereInput;
  const orderByInput = (
    props.body.sort_by && props.body.sort_order
      ? { [props.body.sort_by]: props.body.sort_order }
      : { created_at: "desc" as const }
  ) satisfies Prisma.todo_app_configurationsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.todo_app_configurations.findMany({
    where: whereInput,
    skip: page,
    take: limit,
    orderBy: orderByInput,
  });
  const total = await MyGlobal.prisma.todo_app_configurations.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: Math.floor(page / limit) + 1,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((item) => ({
      id: item.id,
      key: item.key,
      value: item.value,
      type: item.type === null ? null : item.type,
      description: item.description === null ? null : item.description,
      created_at: toISOStringSafe(item.created_at),
      updated_at:
        item.updated_at === null ? null : toISOStringSafe(item.updated_at),
      deleted_at:
        item.deleted_at === null ? null : toISOStringSafe(item.deleted_at),
    })),
  };
}
