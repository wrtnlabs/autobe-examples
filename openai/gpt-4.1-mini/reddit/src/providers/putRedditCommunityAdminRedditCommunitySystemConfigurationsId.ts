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

export async function putRedditCommunityAdminRedditCommunitySystemConfigurationsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunitySystemConfiguration.IUpdate;
}): Promise<IRedditCommunitySystemConfiguration> {
  const { admin, id, body } = props;

  const existingConflict =
    await MyGlobal.prisma.reddit_community_system_configurations.findFirst({
      where: {
        config_key: body.config_key,
        NOT: { id },
      },
      select: { id: true },
    });
  if (existingConflict) {
    throw new HttpException(
      `Conflict: config_key '${body.config_key}' already exists.`,
      409,
    );
  }

  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.reddit_community_system_configurations.update({
      where: { id },
      data: {
        config_key: body.config_key,
        config_value: body.config_value,
        description: body.description ?? null,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    config_key: updated.config_key,
    config_value: updated.config_value,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
