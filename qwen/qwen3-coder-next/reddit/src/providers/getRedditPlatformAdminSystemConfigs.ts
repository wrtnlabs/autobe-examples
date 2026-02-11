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

export async function getRedditPlatformAdminSystemConfigs(props: {
  admin: AdminPayload;
}): Promise<IRedditPlatformSystematicConfig[]> {
  const configs =
    await MyGlobal.prisma.reddit_platform_systematic_configs.findMany({
      orderBy: { config_key: "asc" },
      ...RedditPlatformSystematicConfigTransformer.select(),
    });
  return await ArrayUtil.asyncMap(
    configs,
    RedditPlatformSystematicConfigTransformer.transform,
  );
}
