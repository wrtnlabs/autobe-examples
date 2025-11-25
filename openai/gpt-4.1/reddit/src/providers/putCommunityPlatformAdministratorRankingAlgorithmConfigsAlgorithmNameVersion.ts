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

export async function putCommunityPlatformAdministratorRankingAlgorithmConfigsAlgorithmNameVersion(props: {
  administrator: AdministratorPayload;
  algorithmName: string;
  version: string;
  body: ICommunityPlatformRankingAlgorithmConfigs.IUpdate;
}): Promise<ICommunityPlatformRankingAlgorithmConfigs> {
  const existing =
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

  if (!existing) {
    throw new HttpException("Ranking algorithm configuration not found.", 404);
  }

  const updated =
    await MyGlobal.prisma.community_platform_ranking_algorithm_configs.update({
      where: {
        algorithm_name_version: {
          algorithm_name: props.algorithmName,
          version: props.version,
        },
      },
      data: {
        parameters_json: props.body.parameters_json,
        description:
          props.body.description === undefined
            ? existing.description
            : props.body.description,
        is_active: props.body.is_active,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    algorithm_name: updated.algorithm_name,
    parameters_json: updated.parameters_json,
    version: updated.version,
    description: updated.description,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
