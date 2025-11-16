import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformRankingEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingEventLog";
import { IPageICommunityPlatformRankingEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformRankingEventLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformRankingAlgorithmConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingAlgorithmConfigs";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorRankingEventLogs(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformRankingEventLog.IRequest;
}): Promise<IPageICommunityPlatformRankingEventLog> {
  const body = props.body;
  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  // Build range fields (started_at and finished_at) incrementally
  let startedAtCond: any = undefined;
  if (
    (body.started_at_from !== undefined && body.started_at_from !== null) ||
    (body.started_at_to !== undefined && body.started_at_to !== null)
  ) {
    startedAtCond = {};
    if (body.started_at_from) startedAtCond.gte = body.started_at_from;
    if (body.started_at_to) startedAtCond.lte = body.started_at_to;
  }
  let finishedAtCond: any = undefined;
  if (
    (body.finished_at_from !== undefined && body.finished_at_from !== null) ||
    (body.finished_at_to !== undefined && body.finished_at_to !== null)
  ) {
    finishedAtCond = {};
    if (body.finished_at_from) finishedAtCond.gte = body.finished_at_from;
    if (body.finished_at_to) finishedAtCond.lte = body.finished_at_to;
  }

  // Assemble where object safely
  const where = {
    ...(body.event_type !== undefined &&
      body.event_type !== null && { event_type: body.event_type }),
    ...(body.interval !== undefined &&
      body.interval !== null && { interval: body.interval }),
    ...(body.run_status !== undefined &&
      body.run_status !== null && { run_status: body.run_status }),
    ...(body.algorithm_config_id !== undefined &&
      body.algorithm_config_id !== null && {
        algorithm_config_id: body.algorithm_config_id,
      }),
    ...(startedAtCond !== undefined && { started_at: startedAtCond }),
    ...(finishedAtCond !== undefined && { finished_at: finishedAtCond }),
  };

  const sortKey = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_ranking_event_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortKey]: sortOrder },
      include: {
        algorithmConfig: true,
      },
    }),
    MyGlobal.prisma.community_platform_ranking_event_logs.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    algorithm_config_id: row.algorithm_config_id,
    event_type: row.event_type,
    interval: row.interval,
    run_status: row.run_status,
    event_message:
      typeof row.event_message === "string"
        ? row.event_message
        : row.event_message === null
          ? null
          : undefined,
    started_at: toISOStringSafe(row.started_at),
    finished_at: toISOStringSafe(row.finished_at),
    created_at: toISOStringSafe(row.created_at),
    algorithmConfig: {
      id: row.algorithmConfig.id,
      algorithm_name: row.algorithmConfig.algorithm_name,
      parameters_json: row.algorithmConfig.parameters_json,
      version: row.algorithmConfig.version,
      description:
        typeof row.algorithmConfig.description === "string"
          ? row.algorithmConfig.description
          : row.algorithmConfig.description === null
            ? null
            : undefined,
      is_active: row.algorithmConfig.is_active,
      created_at: toISOStringSafe(row.algorithmConfig.created_at),
      updated_at: toISOStringSafe(row.algorithmConfig.updated_at),
      deleted_at:
        row.algorithmConfig.deleted_at === null
          ? null
          : toISOStringSafe(row.algorithmConfig.deleted_at),
    },
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
