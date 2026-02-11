import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSystematicConfig";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformSystematicConfigTransformer } from "../transformers/RedditPlatformSystematicConfigTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminSystemConfigsConfigKey(props: {
  admin: AdminPayload;
  configKey: string;
  body: IRedditPlatformSystematicConfig.IUpdate;
}): Promise<IRedditPlatformSystematicConfig> {
  // Find existing configuration
  const config =
    await MyGlobal.prisma.reddit_platform_systematic_configs.findUnique({
      where: { config_key: props.configKey },
    });
  // Handle not found case
  if (!config) {
    throw new HttpException("Configuration not found", 404);
  }
  // Build update data
  const updateData: Prisma.reddit_platform_systematic_configsUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  // Add optional fields if provided
  if (props.body.config_value !== undefined) {
    updateData.config_value = props.body.config_value;
  }
  if (props.body.config_type !== undefined) {
    updateData.config_type = props.body.config_type;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.is_active !== undefined) {
    updateData.is_active = props.body.is_active;
  }
  // Update the configuration
  const updated =
    await MyGlobal.prisma.reddit_platform_systematic_configs.update({
      where: { config_key: props.configKey },
      data: updateData,
      ...RedditPlatformSystematicConfigTransformer.select(),
    });
  // Transform and return
  return await RedditPlatformSystematicConfigTransformer.transform(updated);
}
