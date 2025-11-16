import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformRankingEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingEventLog";
import { ICommunityPlatformRankingAlgorithmConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingAlgorithmConfigs";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorRankingEventLogsEventLogId(props: {
  administrator: AdministratorPayload;
  eventLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformRankingEventLog> {
  const log =
    await MyGlobal.prisma.community_platform_ranking_event_logs.findUnique({
      where: { id: props.eventLogId },
      include: { algorithmConfig: true },
    });

  if (!log) {
    throw new HttpException("Ranking event log not found", 404);
  }

  return {
    id: log.id,
    algorithm_config_id: log.algorithm_config_id,
    event_type: log.event_type,
    interval: log.interval,
    run_status: log.run_status,
    event_message:
      log.event_message !== undefined ? log.event_message : undefined,
    started_at: toISOStringSafe(log.started_at),
    finished_at: toISOStringSafe(log.finished_at),
    created_at: toISOStringSafe(log.created_at),
    algorithmConfig: {
      id: log.algorithmConfig.id,
      algorithm_name: log.algorithmConfig.algorithm_name,
      parameters_json: log.algorithmConfig.parameters_json,
      version: log.algorithmConfig.version,
      description:
        log.algorithmConfig.description !== undefined
          ? log.algorithmConfig.description
          : undefined,
      is_active: log.algorithmConfig.is_active,
      created_at: toISOStringSafe(log.algorithmConfig.created_at),
      updated_at: toISOStringSafe(log.algorithmConfig.updated_at),
      deleted_at:
        log.algorithmConfig.deleted_at !== null &&
        log.algorithmConfig.deleted_at !== undefined
          ? toISOStringSafe(log.algorithmConfig.deleted_at)
          : log.algorithmConfig.deleted_at,
    },
  };
}
