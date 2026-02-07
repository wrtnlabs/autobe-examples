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

export async function putCommunityAdminSystemConfigsConfigId(props: {
  admin: AdminPayload;
  configId: string;
  body: ICommunitySystemConfig;
}): Promise<ICommunitySystemConfig> {
  // Fetch existing record to validate type before update
  const existing = await MyGlobal.prisma.community_system_configs.findUnique({
    where: { id: props.configId },
  });
  if (!existing) {
    throw new HttpException("Configuration not found", 404);
  }
  // Validate type matches (as per spec: Do not allow type changes)
  // Cast body to any to access fields that are not in the empty interface
  const bodyAny = props.body as any;
  if (existing.type !== bodyAny.type) {
    throw new HttpException("Configuration type cannot be changed", 400);
  }
  // Perform update: replace all fields except id and created_at
  const updated = await MyGlobal.prisma.community_system_configs.update({
    where: { id: props.configId },
    data: {
      name: bodyAny.name,
      value: bodyAny.value,
      type: bodyAny.type,
      enabled: bodyAny.enabled,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return updated record with all fields
  return {
    id: updated.id,
    name: updated.name,
    value: updated.value,
    type: updated.type,
    enabled: updated.enabled,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  };
}
