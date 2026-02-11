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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminSystemConfigsBulk(props: {
  admin: AdminPayload;
  body: IRedditPlatformSystematicConfig.IUpdateBulk;
}): Promise<IRedditPlatformSystematicConfig.IBulkResponse> {
  const updatedConfigs: IRedditPlatformSystematicConfig[] = [];
  for (const update of props.body.value) {
    // Find existing configuration by key
    // IUpdate doesn't include config_key, which is required to identify which config to update
    // This appears to be a DTO design issue - IUpdate should include config_key
    throw new HttpException(
      "Configuration update must include config_key to identify which configuration to update",
      400,
    );
  }
  return {
    configs: updatedConfigs,
    successCount: updatedConfigs.length,
    totalCount: updatedConfigs.length,
  };
}
