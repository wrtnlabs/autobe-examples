import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformRankingEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingEventLog";
import { ICommunityPlatformRankingAlgorithmConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingAlgorithmConfigs";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putCommunityPlatformAdministratorRankingEventLogsEventLogId(props: {
  administrator: AdministratorPayload;
  eventLogId: string & tags.Format<"uuid">;
  body: ICommunityPlatformRankingEventLog.IUpdate;
}): Promise<ICommunityPlatformRankingEventLog> {
  // 1. Validate event log exists
  const existing =
    await MyGlobal.prisma.community_platform_ranking_event_logs.findUnique({
      where: {
        id: props.eventLogId,
      },
    });

  if (!existing) {
    throw new HttpException("Ranking event log not found.", 404);
  }

  // 2. Validate algorithm config exists
  const algoConfig =
    await MyGlobal.prisma.community_platform_ranking_algorithm_configs.findUnique(
      {
        where: {
          id: props.body.algorithm_config_id,
          deleted_at: null,
        },
      },
    );
  if (!algoConfig) {
    throw new HttpException(
      "Referenced ranking algorithm configuration not found or has been deleted.",
      400,
    );
  }

  // 3. Execute update
  const updated =
    await MyGlobal.prisma.community_platform_ranking_event_logs.update({
      where: { id: props.eventLogId },
      data: {
        event_type: props.body.event_type,
        interval: props.body.interval,
        run_status: props.body.run_status,
        event_message: props.body.event_message ?? null,
        started_at: props.body.started_at,
        finished_at: props.body.finished_at,
        algorithm_config_id: props.body.algorithm_config_id,
      },
      include: {
        algorithmConfig: true,
      },
    });

  return {
    id: updated.id,
    algorithm_config_id: updated.algorithm_config_id,
    event_type: updated.event_type,
    interval: updated.interval,
    run_status: updated.run_status,
    event_message: updated.event_message ?? undefined,
    started_at: toISOStringSafe(updated.started_at),
    finished_at: toISOStringSafe(updated.finished_at),
    created_at: toISOStringSafe(updated.created_at),
    algorithmConfig: {
      id: updated.algorithmConfig.id,
      algorithm_name: updated.algorithmConfig.algorithm_name,
      parameters_json: updated.algorithmConfig.parameters_json,
      version: updated.algorithmConfig.version,
      description: updated.algorithmConfig.description ?? undefined,
      is_active: updated.algorithmConfig.is_active,
      created_at: toISOStringSafe(updated.algorithmConfig.created_at),
      updated_at: toISOStringSafe(updated.algorithmConfig.updated_at),
      deleted_at:
        updated.algorithmConfig.deleted_at !== undefined &&
        updated.algorithmConfig.deleted_at !== null
          ? toISOStringSafe(updated.algorithmConfig.deleted_at)
          : undefined,
    },
  };
}
