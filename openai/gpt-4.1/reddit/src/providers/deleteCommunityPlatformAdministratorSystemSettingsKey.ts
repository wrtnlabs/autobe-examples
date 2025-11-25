import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorSystemSettingsKey(props: {
  administrator: AdministratorPayload;
  key: string;
}): Promise<void> {
  // 1. Check existence of the system setting by key
  const setting =
    await MyGlobal.prisma.community_platform_system_settings.findUnique({
      where: { key: props.key },
    });

  if (!setting) {
    throw new HttpException("Setting not found", 404);
  }

  // 2. Hard delete the record (not a soft delete)
  await MyGlobal.prisma.community_platform_system_settings.delete({
    where: { key: props.key },
  });
}
