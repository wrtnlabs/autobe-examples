import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminSystemConfigsSystemConfigId(props: {
  admin: AdminPayload;
  systemConfigId: string & tags.Format<"uuid">;
  body: ICommunityPlatformSystemConfig.IUpdate;
}): Promise<ICommunityPlatformSystemConfig> {
  const now = toISOStringSafe(new Date());

  // Step 1: Find the existing config to check existence (and get created_at)
  const existing =
    await MyGlobal.prisma.community_platform_system_configs.findUnique({
      where: { id: props.systemConfigId },
    });
  if (!existing) {
    throw new HttpException("System config not found", 404);
  }

  // Step 2: Attempt update
  let updated;
  try {
    updated = await MyGlobal.prisma.community_platform_system_configs.update({
      where: { id: props.systemConfigId },
      data: {
        key: props.body.key,
        value: props.body.value,
        description: props.body.description ?? undefined,
        updated_at: now,
      },
    });
  } catch (err) {
    // Unique constraint violation for key
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("Config key must be unique", 409);
    }
    throw err;
  }
  // Step 3: Return full object, mapping types as required
  return {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
