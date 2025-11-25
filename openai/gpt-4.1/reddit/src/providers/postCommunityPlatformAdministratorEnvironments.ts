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

export async function postCommunityPlatformAdministratorEnvironments(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformEnvironment.ICreate;
}): Promise<ICommunityPlatformEnvironment> {
  const { env_key, display_name, description } = props.body;

  // Check for uniqueness of env_key
  const existing =
    await MyGlobal.prisma.community_platform_environments.findUnique({
      where: { env_key },
    });
  if (existing) {
    throw new HttpException(
      `Environment with env_key '${env_key}' already exists.`,
      409,
    );
  }

  const id = v4();
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.community_platform_environments.create({
    data: {
      id: id,
      env_key: env_key,
      display_name: display_name,
      description: description !== undefined ? description : null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    env_key: created.env_key,
    display_name: created.display_name,
    description: created.description !== null ? created.description : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
