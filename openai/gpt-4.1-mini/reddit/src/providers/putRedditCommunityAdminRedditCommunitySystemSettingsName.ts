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

export async function putRedditCommunityAdminRedditCommunitySystemSettingsName(props: {
  admin: AdminPayload;
  name: string;
  body: IRedditCommunitySystemSettings.IUpdate;
}): Promise<IRedditCommunitySystemSettings> {
  const existing =
    await MyGlobal.prisma.reddit_community_system_settings.findUnique({
      where: { name: props.name },
    });
  if (!existing) {
    throw new HttpException("System setting not found", 404);
  }
  const updated = await MyGlobal.prisma.reddit_community_system_settings.update(
    {
      where: { name: props.name },
      data: {
        value: props.body.value,
        description: props.body.description ?? null,
      },
    },
  );
  return {
    name: updated.name,
    value: updated.value,
    description: updated.description ?? null,
  };
}
