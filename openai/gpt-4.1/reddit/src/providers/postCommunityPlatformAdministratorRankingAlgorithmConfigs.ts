import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformRankingAlgorithmConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingAlgorithmConfigs";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function postCommunityPlatformAdministratorRankingAlgorithmConfigs(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformRankingAlgorithmConfigs.ICreate;
}): Promise<ICommunityPlatformRankingAlgorithmConfigs> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const result =
    await MyGlobal.prisma.community_platform_ranking_algorithm_configs.create({
      data: {
        id: v4(),
        algorithm_name: props.body.algorithm_name,
        parameters_json: props.body.parameters_json,
        version: props.body.version,
        description: props.body.description ?? null,
        is_active: props.body.is_active,
        created_at: now,
        updated_at: now,
        // deleted_at is managed by system and not set on creation
      },
    });
  return {
    id: result.id,
    algorithm_name: result.algorithm_name,
    parameters_json: result.parameters_json,
    version: result.version,
    description: result.description,
    is_active: result.is_active,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    ...(typeof result.deleted_at !== "undefined"
      ? {
          deleted_at:
            result.deleted_at === null
              ? null
              : toISOStringSafe(result.deleted_at),
        }
      : {}),
  };
}
