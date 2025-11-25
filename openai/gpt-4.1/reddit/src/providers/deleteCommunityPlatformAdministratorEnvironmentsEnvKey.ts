import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEnvironment";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorEnvironmentsEnvKey(props: {
  administrator: AdministratorPayload;
  envKey: string;
}): Promise<ICommunityPlatformEnvironment> {
  const env = await MyGlobal.prisma.community_platform_environments.findUnique({
    where: { env_key: props.envKey },
  });
  if (!env || env.deleted_at !== null) {
    throw new HttpException("Environment not found or already retired.", 404);
  }
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_environments.update({
    where: { env_key: props.envKey },
    data: { deleted_at: now, updated_at: now },
  });
  return {
    id: updated.id,
    env_key: updated.env_key,
    display_name: updated.display_name,
    description:
      typeof updated.description === "undefined"
        ? undefined
        : updated.description === null
          ? null
          : updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
