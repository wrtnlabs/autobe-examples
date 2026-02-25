import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceAdministratorSystemSettingsSettingId(props: {
  administrator: AdministratorPayload;
  settingId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the target setting exists and is not already soft-deleted
  const setting = await MyGlobal.prisma.ecommerce_system_settings.findFirst({
    where: {
      id: props.settingId,
      deleted_at: null,
    },
  });
  if (!setting) {
    throw new HttpException("System setting not found or already deleted", 404);
  }
  // Perform soft deletion by updating deleted_at with current timestamp
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ecommerce_system_settings.update({
    where: { id: props.settingId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
