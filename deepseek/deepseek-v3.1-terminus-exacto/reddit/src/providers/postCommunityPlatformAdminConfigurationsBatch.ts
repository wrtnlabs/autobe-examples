import { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformConfigurationTransformer } from "../transformers/CommunityPlatformConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminConfigurationsBatch(props: {
  admin: AdminPayload;
  body: ICommunityPlatformConfiguration.IBatchUpdate;
}): Promise<ICommunityPlatformConfiguration[]> {
  // Validate all configuration keys exist before starting transaction
  const configKeys = props.body.updates.map((update) => update.config_key);
  const existingConfigs =
    await MyGlobal.prisma.community_platform_configurations.findMany({
      where: {
        config_key: { in: configKeys },
        deleted_at: null,
      },
      select: { config_key: true },
    });
  const existingKeys = new Set(
    existingConfigs.map((config) => config.config_key),
  );
  const missingKeys = configKeys.filter((key) => !existingKeys.has(key));
  if (missingKeys.length > 0) {
    throw new HttpException(
      `Configuration keys not found: ${missingKeys.join(", ")}`,
      404,
    );
  }
  // Process updates in a transaction for atomicity
  const updatedConfigs = await MyGlobal.prisma.$transaction(async (tx) => {
    const results = [];
    for (const update of props.body.updates) {
      const updated = await tx.community_platform_configurations.update({
        where: { config_key: update.config_key },
        data: {
          config_value: update.config_value,
          updated_at: new Date(),
        },
        ...CommunityPlatformConfigurationTransformer.select(),
      });
      results.push(updated);
    }
    return results;
  });
  // Transform all updated configurations
  return await Promise.all(
    updatedConfigs.map((config) =>
      CommunityPlatformConfigurationTransformer.transform(config),
    ),
  );
}
