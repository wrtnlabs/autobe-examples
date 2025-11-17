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

export async function getRedditCommunityAdminRedditCommunitySystemConfigurationsName(props: {
  admin: AdminPayload;
  name: string;
}): Promise<IRedditCommunitySystemConfiguration> {
  const record =
    await MyGlobal.prisma.reddit_community_system_configurations.findUnique({
      where: { name: props.name },
    });

  if (record === null) {
    throw new HttpException(
      `System configuration not found for name: ${props.name}`,
      404,
    );
  }

  return {
    id: record.id,
    name: record.name,
    value: record.value,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
