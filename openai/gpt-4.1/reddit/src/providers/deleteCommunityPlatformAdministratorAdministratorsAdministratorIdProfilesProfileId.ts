import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorAdministratorsAdministratorIdProfilesProfileId(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  profileId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Ensure that only an administrator may perform this action
  if (props.administrator.type !== "administrator") {
    throw new HttpException(
      "Only platform administrators may delete administrator profiles.",
      403,
    );
  }

  // Find the administrator profile to ensure it exists and is not already deleted
  const profile =
    await MyGlobal.prisma.community_platform_administrator_profiles.findFirst({
      where: {
        id: props.profileId,
        administrator: { id: props.administratorId },
        deleted_at: null,
      },
    });

  if (!profile) {
    throw new HttpException(
      "Administrator profile not found or already deleted.",
      404,
    );
  }

  // Soft delete by marking deleted_at
  await MyGlobal.prisma.community_platform_administrator_profiles.update({
    where: { id: props.profileId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // Optionally trigger an audit log here (out of scope)
}
