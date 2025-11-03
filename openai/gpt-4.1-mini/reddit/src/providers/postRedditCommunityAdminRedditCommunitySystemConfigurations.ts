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

export async function postRedditCommunityAdminRedditCommunitySystemConfigurations(props: {
  admin: AdminPayload;
  body: IRedditCommunitySystemConfiguration.ICreate;
}): Promise<IRedditCommunitySystemConfiguration> {
  const { body } = props;

  const now = new Date();

  const created =
    await MyGlobal.prisma.reddit_community_system_configurations.create({
      data: {
        id: v4(),
        config_key: body.config_key,
        config_value: body.config_value,
        description: body.description ?? null,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    config_key: created.config_key,
    config_value: created.config_value,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
