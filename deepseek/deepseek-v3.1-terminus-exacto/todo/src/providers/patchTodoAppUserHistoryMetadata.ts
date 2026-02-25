import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppHistoryMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppHistoryMetadatum";
import { ITodoAppHistoryMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppHistoryMetadatum";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserHistoryMetadata(props: {
  user: UserPayload;
  body: ITodoAppHistoryMetadatum.IRequest;
}): Promise<IPageITodoAppHistoryMetadatum.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  const conditions: Prisma.todo_app_history_metadataWhereInput[] = [];
  if (props.body.search) {
    conditions.push({
      config_key: { contains: props.body.search, mode: "insensitive" },
    });
  }
  if (props.body.is_active !== undefined) {
    conditions.push({ is_active: props.body.is_active });
  }
  if (
    props.body.retention_days_min !== undefined ||
    props.body.retention_days_max !== undefined
  ) {
    conditions.push({
      retention_days: {
        ...(props.body.retention_days_min !== undefined && {
          gte: props.body.retention_days_min,
        }),
        ...(props.body.retention_days_max !== undefined && {
          lte: props.body.retention_days_max,
        }),
      },
    });
  }
  if (props.body.cleanup_frequency) {
    conditions.push({ cleanup_frequency: props.body.cleanup_frequency });
  }
  const whereInput: Prisma.todo_app_history_metadataWhereInput =
    conditions.length > 0 ? { AND: conditions } : {};
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_history_metadata.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_app_history_metadata.count({ where: whereInput }),
  ]);
  const summaryData: ITodoAppHistoryMetadatum.ISummary[] = data.map((item) => ({
    config_key: item.config_key,
    config_value: item.config_value,
    config_description: item.config_description,
    is_active: item.is_active,
    retention_days: item.retention_days ?? null,
    cleanup_frequency: item.cleanup_frequency ?? null,
  }));
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
