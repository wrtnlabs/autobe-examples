import { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformConfigurationCollector } from "../collectors/CommunityPlatformConfigurationCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformConfigurationTransformer } from "../transformers/CommunityPlatformConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postCommunityPlatformAdminConfigurations(props: {
  admin: AdminPayload;
  body: ICommunityPlatformConfiguration.ICreate;
}): Promise<ICommunityPlatformConfiguration> {
  // Check if config_key already exists
  const existing =
    await MyGlobal.prisma.community_platform_configurations.findUnique({
      where: {
        config_key: props.body.config_key,
      },
    });
  if (existing && existing.deleted_at === null) {
    throw new HttpException("Configuration key must be unique", 400);
  }
  // Create the configuration using collector
  const created =
    await MyGlobal.prisma.community_platform_configurations.create({
      data: await CommunityPlatformConfigurationCollector.collect({
        body: props.body,
      }),
      ...CommunityPlatformConfigurationTransformer.select(),
    });
  // Return transformed response
  return await CommunityPlatformConfigurationTransformer.transform(created);
}
