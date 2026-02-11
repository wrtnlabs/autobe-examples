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

export async function getRedditPlatformAdminSystemConfigsConfigKey(props: {
  admin: AdminPayload;
  configKey: string;
}): Promise<IRedditPlatformSystematicConfig> {
  const config =
    await MyGlobal.prisma.reddit_platform_systematic_configs.findUnique({
      where: { config_key: props.configKey },
      ...RedditPlatformSystematicConfigTransformer.select(),
    });
  if (!config) throw new HttpException("Configuration not found", 404);
  return await RedditPlatformSystematicConfigTransformer.transform(config);
}
