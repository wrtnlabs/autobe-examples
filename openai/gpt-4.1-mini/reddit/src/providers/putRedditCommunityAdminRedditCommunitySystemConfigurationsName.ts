import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminRedditCommunitySystemConfigurationsName(props: {
  admin: AdminPayload;
  name: string;
  body: IRedditCommunitySystemConfiguration.IUpdate;
}): Promise<IRedditCommunitySystemConfiguration> {
  const existing =
    await MyGlobal.prisma.reddit_community_system_configurations.findUnique({
      where: { name: props.name },
    });

  if (!existing) {
    throw new HttpException(
      `System configuration with name '${props.name}' not found`,
      404,
    );
  }

  const updated =
    await MyGlobal.prisma.reddit_community_system_configurations.update({
      where: { name: props.name },
      data: {
        value: props.body.value,
        description: props.body.description ?? null,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    name: updated.name,
    value: updated.value,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
