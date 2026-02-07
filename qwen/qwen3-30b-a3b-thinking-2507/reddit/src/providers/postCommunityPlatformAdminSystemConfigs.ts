import { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformSystemConfigCollector } from "../collectors/CommunityPlatformSystemConfigCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminSystemConfigs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSystemConfig.ICreate;
}): Promise<ICommunityPlatformSystemConfig> {
  const existing =
    await MyGlobal.prisma.community_platform_system_configs.findUnique({
      where: { key: props.body.key },
    });
  if (existing) {
    throw new HttpException("Key already exists", 409);
  }
  const created =
    await MyGlobal.prisma.community_platform_system_configs.create({
      data: await CommunityPlatformSystemConfigCollector.collect({
        body: props.body,
      }),
    });
  return {
    id: created.id as string & tags.Format<"uuid">,
    key: created.key,
    value: created.value,
    description: created.description,
    type: created.type,
    default_value: created.default_value,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
