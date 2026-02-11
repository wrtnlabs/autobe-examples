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

export async function putRedditPlatformAdminSystemConfigsConfigKey(props: {
  admin: AdminPayload;
  configKey: string;
  body: IRedditPlatformSystematicConfig.IUpdate;
}): Promise<IRedditPlatformSystematicConfig> {
  const existing =
    await MyGlobal.prisma.reddit_platform_systematic_configs.findFirst({
      where: { config_key: props.configKey },
    });
  if (!existing) throw new HttpException("Configuration not found", 404);
  const updated =
    await MyGlobal.prisma.reddit_platform_systematic_configs.update({
      where: { id: existing.id },
      data: {
        ...props.body,
        config_key: props.configKey,
        created_at: toISOStringSafe(existing.created_at),
        updated_at: toISOStringSafe(new Date()),
      } satisfies Prisma.JsonObject,
      ...RedditPlatformSystematicConfigTransformer.select(),
    });
  return await RedditPlatformSystematicConfigTransformer.transform(updated);
}
