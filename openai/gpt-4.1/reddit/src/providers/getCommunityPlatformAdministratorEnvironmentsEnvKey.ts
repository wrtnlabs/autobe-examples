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

export async function getCommunityPlatformAdministratorEnvironmentsEnvKey(props: {
  administrator: AdministratorPayload;
  envKey: string;
}): Promise<ICommunityPlatformEnvironment> {
  const record =
    await MyGlobal.prisma.community_platform_environments.findUnique({
      where: { env_key: props.envKey },
    });
  if (!record) {
    throw new HttpException("Environment not found", 404);
  }
  return {
    id: record.id,
    env_key: record.env_key,
    display_name: record.display_name,
    description:
      typeof record.description === "undefined"
        ? undefined
        : record.description,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      typeof record.deleted_at === "undefined"
        ? undefined
        : record.deleted_at === null
          ? null
          : toISOStringSafe(record.deleted_at),
  };
}
