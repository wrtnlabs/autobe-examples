import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceSuperAdministratorSystemSettingsSettingId(props: {
  superAdministrator: SuperadministratorPayload;
  settingId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the system setting exists and is not already deleted
  const existingSetting =
    await MyGlobal.prisma.ecommerce_system_settings.findUniqueOrThrow({
      where: {
        id: props.settingId,
        deleted_at: null,
      },
    });
  // Soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.ecommerce_system_settings.update({
    where: { id: props.settingId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
