import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminProfilesProfileId(props: {
  admin: AdminPayload;
  profileId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find profile, ensure it exists and is not already deleted
  const profile = await MyGlobal.prisma.community_platform_profiles.findUnique({
    where: { id: props.profileId },
  });
  if (!profile) {
    throw new HttpException("Profile not found", 404);
  }
  if (profile.deleted_at) {
    throw new HttpException("Profile is already deleted", 409);
  }
  // 2. Soft delete the profile
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_profiles.update({
    where: { id: props.profileId },
    data: { deleted_at: now },
  });
  // 3. Audit log
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "admin",
      actor_id: props.admin.id,
      action_type: "delete",
      target_table: "community_platform_profiles",
      target_id: props.profileId,
      details: null,
      created_at: now,
    },
  });
}
