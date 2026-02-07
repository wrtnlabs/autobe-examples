import { ICommunitySystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySystemConfig";
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

export async function getCommunityAdminSystemConfigsConfigId(props: {
  admin: AdminPayload;
  configId: string;
}): Promise<ICommunitySystemConfig> {
  const config = await MyGlobal.prisma.community_system_configs.findUnique({
    where: { id: props.configId },
  });
  if (!config) {
    throw new HttpException("Configuration not found", 404);
  }
  return {
    id: config.id,
    name: config.name,
    value: config.value,
    type: config.type,
    enabled: config.enabled,
    created_at: config.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: config.updated_at.toISOString() as string &
      tags.Format<"date-time">,
  };
}
