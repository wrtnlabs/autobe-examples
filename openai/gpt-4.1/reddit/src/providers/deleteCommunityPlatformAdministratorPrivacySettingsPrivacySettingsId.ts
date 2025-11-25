import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorPrivacySettingsPrivacySettingsId(props: {
  administrator: AdministratorPayload;
  privacySettingsId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Lookup the privacy settings record
  const record =
    await MyGlobal.prisma.community_platform_privacy_settings.findUnique({
      where: { id: props.privacySettingsId },
    });

  if (!record || record.deleted_at !== null) {
    throw new HttpException(
      "Privacy settings not found or already deleted.",
      404,
    );
  }

  // Only the owner of the privacy settings or a platform administrator can delete
  // (administrator has system-wide privileges, so any administrator can perform this)
  await MyGlobal.prisma.community_platform_privacy_settings.update({
    where: { id: props.privacySettingsId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });

  // No response body (void)
}
