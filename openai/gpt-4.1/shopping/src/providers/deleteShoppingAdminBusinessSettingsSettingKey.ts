import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminBusinessSettingsSettingKey(props: {
  admin: AdminPayload;
  settingKey: string;
}): Promise<void> {
  const { admin, settingKey } = props;

  // 1. Ensure the business setting exists
  const existing = await MyGlobal.prisma.shopping_business_settings.findUnique({
    where: { setting_key: settingKey },
  });
  if (!existing) {
    throw new HttpException(
      `No business setting found for settingKey '${settingKey}'`,
      404,
    );
  }

  // 2. Hard delete the row
  await MyGlobal.prisma.shopping_business_settings.delete({
    where: { setting_key: settingKey },
  });

  // 3. Audit-log the deletion
  await MyGlobal.prisma.shopping_audit_logs.create({
    data: {
      id: v4(),
      admin_id: admin.id,
      category: "business_settings",
      event_type: "DELETE",
      description: `Admin (id=${admin.id}) permanently deleted business setting '${settingKey}'.`,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
