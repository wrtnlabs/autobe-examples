import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditPlatformAdminSystemConfigsConfigKey(props: {
  admin: AdminPayload;
  configKey: string;
}): Promise<void> {
  const config =
    await MyGlobal.prisma.reddit_platform_systematic_configs.findFirst({
      where: { config_key: props.configKey },
    });
  if (!config) {
    throw new HttpException("Configuration not found", 404);
  }
  await MyGlobal.prisma.reddit_platform_systematic_configs.delete({
    where: { id: config.id },
  });
}
