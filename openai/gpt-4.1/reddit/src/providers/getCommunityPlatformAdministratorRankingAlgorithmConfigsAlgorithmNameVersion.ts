import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformRankingAlgorithmConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRankingAlgorithmConfigs";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorRankingAlgorithmConfigsAlgorithmNameVersion(props: {
  administrator: AdministratorPayload;
  algorithmName: string;
  version: string;
}): Promise<ICommunityPlatformRankingAlgorithmConfigs> {
  const config =
    await MyGlobal.prisma.community_platform_ranking_algorithm_configs.findUnique(
      {
        where: {
          algorithm_name_version: {
            algorithm_name: props.algorithmName,
            version: props.version,
          },
        },
      },
    );

  if (!config) {
    throw new HttpException("Ranking algorithm configuration not found", 404);
  }

  return {
    id: config.id,
    algorithm_name: config.algorithm_name,
    parameters_json: config.parameters_json,
    version: config.version,
    description: config.description ?? undefined,
    is_active: config.is_active,
    created_at: toISOStringSafe(config.created_at),
    updated_at: toISOStringSafe(config.updated_at),
    deleted_at: config.deleted_at ? toISOStringSafe(config.deleted_at) : null,
  };
}
