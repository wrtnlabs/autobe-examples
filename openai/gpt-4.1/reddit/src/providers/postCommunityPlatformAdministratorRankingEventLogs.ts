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

export async function postCommunityPlatformAdministratorRankingEventLogs(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformRankingEventLog.ICreate;
}): Promise<ICommunityPlatformRankingEventLog> {
  // Step 1: Validate the referenced ranking algorithm config
  const algorithmConfig =
    await MyGlobal.prisma.community_platform_ranking_algorithm_configs.findFirst(
      {
        where: {
          id: props.body.algorithm_config_id,
          deleted_at: null,
        },
      },
    );

  if (!algorithmConfig) {
    throw new HttpException(
      "Referenced ranking algorithm configuration does not exist or has been deleted.",
      404,
    );
  }

  // Step 2: Insert event log record (explicit field assignment, no type assertions)
  const createdLog =
    await MyGlobal.prisma.community_platform_ranking_event_logs.create({
      data: {
        id: v4(),
        algorithm_config_id: props.body.algorithm_config_id,
        event_type: props.body.event_type,
        interval: props.body.interval,
        run_status: props.body.run_status,
        event_message: Object.prototype.hasOwnProperty.call(
          props.body,
          "event_message",
        )
          ? props.body.event_message
          : undefined,
        started_at: props.body.started_at,
        finished_at: props.body.finished_at,
        created_at: toISOStringSafe(new Date()),
      },
    });

  // Step 3: Format and return response object, cast nothing, handle null/undefined per DTO
  return {
    id: createdLog.id,
    algorithm_config_id: createdLog.algorithm_config_id,
    event_type: createdLog.event_type,
    interval: createdLog.interval,
    run_status: createdLog.run_status,
    event_message: createdLog.event_message ?? undefined,
    started_at: toISOStringSafe(createdLog.started_at),
    finished_at: toISOStringSafe(createdLog.finished_at),
    created_at: toISOStringSafe(createdLog.created_at),
    algorithmConfig: {
      id: algorithmConfig.id,
      algorithm_name: algorithmConfig.algorithm_name,
      parameters_json: algorithmConfig.parameters_json,
      version: algorithmConfig.version,
      description: Object.prototype.hasOwnProperty.call(
        algorithmConfig,
        "description",
      )
        ? (algorithmConfig.description ?? undefined)
        : undefined,
      is_active: algorithmConfig.is_active,
      created_at: toISOStringSafe(algorithmConfig.created_at),
      updated_at: toISOStringSafe(algorithmConfig.updated_at),
      deleted_at:
        typeof algorithmConfig.deleted_at === "string"
          ? algorithmConfig.deleted_at
          : algorithmConfig.deleted_at === null
            ? null
            : undefined,
    },
  };
}
