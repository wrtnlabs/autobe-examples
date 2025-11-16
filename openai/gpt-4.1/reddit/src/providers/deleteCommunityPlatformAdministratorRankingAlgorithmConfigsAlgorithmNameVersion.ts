import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorRankingAlgorithmConfigsAlgorithmNameVersion(props: {
  administrator: AdministratorPayload;
  algorithmName: string;
  version: string;
}): Promise<void> {
  // First, find the configuration by composite unique key
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
    throw new HttpException("Ranking algorithm configuration not found.", 404);
  }

  if (config.is_active) {
    throw new HttpException(
      "Cannot delete an active ranking algorithm configuration.",
      400,
    );
  }

  // Perform hard delete
  await MyGlobal.prisma.community_platform_ranking_algorithm_configs.delete({
    where: {
      algorithm_name_version: {
        algorithm_name: props.algorithmName,
        version: props.version,
      },
    },
  });
}
