import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfigurationSnapshot";
import { IPageITodoAppConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppConfigurationSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserConfigurationsConfigKeySnapshots(props: {
  user: UserPayload;
  configKey: string;
  snapshotId: string & tags.Format<"uuid">;
  body: ITodoAppConfigurationSnapshot.IRequest;
}): Promise<IPageITodoAppConfigurationSnapshot.ISummary> {
  // Verify the configuration key exists and user has access
  const configuration = await MyGlobal.prisma.todo_app_configurations.findFirst(
    {
      where: {
        config_key: props.configKey,
        deleted_at: null,
      },
    },
  );

  if (!configuration) {
    throw new HttpException("Configuration not found", 404);
  }

  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build WHERE conditions
  const whereConditions: Record<string, unknown> = {
    config_key: props.configKey,
    todo_app_configuration_id: configuration.id,
  };

  // Apply search filter
  if (props.body.search) {
    whereConditions.OR = [
      { config_key: { contains: props.body.search, mode: "insensitive" } },
      { name: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
      { snapshot_reason: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Apply version filter
  if (props.body.version !== undefined) {
    whereConditions.version = props.body.version;
  }

  // Apply snapshot reason filter
  if (props.body.snapshot_reason) {
    whereConditions.snapshot_reason = props.body.snapshot_reason;
  }

  // Apply category filter
  if (props.body.category) {
    whereConditions.category = props.body.category;
  }

  // Apply date range filters
  if (props.body.created_from || props.body.created_to) {
    whereConditions.created_at = {};
    if (props.body.created_from) {
      (whereConditions.created_at as Record<string, unknown>).gte =
        props.body.created_from;
    }
    if (props.body.created_to) {
      (whereConditions.created_at as Record<string, unknown>).lte =
        props.body.created_to;
    }
  }

  // Apply configuration ID filter
  if (props.body.configuration_id) {
    whereConditions.todo_app_configuration_id = props.body.configuration_id;
  }

  // Build ORDER BY
  const orderBy: Record<string, "asc" | "desc"> = {};
  const orderField = props.body.order_by || "created_at";
  const orderDirection = props.body.order_direction || "desc";

  orderBy[orderField] = orderDirection;

  // Execute concurrent queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_configuration_snapshots.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_app_configuration_snapshots.count({
      where: whereConditions,
    }),
  ]);

  // Transform data to match API response
  const transformedData = data.map((snapshot) => ({
    id: snapshot.id,
    config_key: snapshot.config_key,
    name: snapshot.name,
    category: snapshot.category,
    version: snapshot.version,
    snapshot_reason: snapshot.snapshot_reason,
    created_at: toISOStringSafe(snapshot.created_at),
  }));

  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
