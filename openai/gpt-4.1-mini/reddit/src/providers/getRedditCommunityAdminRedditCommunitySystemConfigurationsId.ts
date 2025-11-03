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

export async function getRedditCommunityAdminRedditCommunitySystemConfigurationsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRedditCommunitySystemConfiguration> {
  const { id } = props;

  const config =
    await MyGlobal.prisma.reddit_community_system_configurations.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  return {
    id: config.id,
    config_key: config.config_key,
    config_value: config.config_value,
    description: config.description ?? null,
    created_at: toISOStringSafe(config.created_at),
    updated_at: toISOStringSafe(config.updated_at),
  };
}
