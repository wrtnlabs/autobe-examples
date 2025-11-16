import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunitySystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSettings";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditCommunityAdminRedditCommunitySystemSettings(props: {
  admin: AdminPayload;
  body: IRedditCommunitySystemSettings.ICreate;
}): Promise<IRedditCommunitySystemSettings> {
  const created = await MyGlobal.prisma.reddit_community_system_settings.create(
    {
      data: {
        name: props.body.name,
        value: props.body.value,
        description: props.body.description ?? undefined,
      } as Prisma.reddit_community_system_settingsCreateInput,
    },
  );

  return {
    name: created.name,
    value: created.value,
    description: created.description ?? undefined,
  };
}
