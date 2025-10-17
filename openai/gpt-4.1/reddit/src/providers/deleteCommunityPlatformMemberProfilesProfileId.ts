import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteCommunityPlatformMemberProfilesProfileId(props: {
  member: MemberPayload;
  profileId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch the profile
  const profile = await MyGlobal.prisma.community_platform_profiles.findUnique({
    where: { id: props.profileId },
    select: {
      id: true,
      community_platform_member_id: true,
      deleted_at: true,
    },
  });

  // 2. If profile does not exist, throw 404
  if (!profile) {
    throw new HttpException("Profile not found", 404);
  }

  // 3. If already deleted, block with 400
  if (profile.deleted_at) {
    throw new HttpException("Profile already deleted", 400);
  }

  // 4. Only the profile owner can delete
  if (profile.community_platform_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: Only the profile owner can delete their profile",
      403,
    );
  }

  // 5. Soft-delete the profile by setting deleted_at
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_profiles.update({
    where: { id: props.profileId },
    data: { deleted_at: now },
  });

  // 6. Return nothing on success
  return;
}
