import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformMemberProfile(props: {
  member: MemberPayload;
}): Promise<void> {
  const now = new Date().toISOString();
  await MyGlobal.prisma.$transaction(async (tx) => {
    const profile = await tx.community_platform_user_profiles.findFirst({
      where: { community_platform_member_id: props.member.id },
      select: { id: true, deleted_at: true },
    });
    if (!profile) {
      throw new HttpException("Profile not found", 404);
    }
    await tx.community_platform_user_profiles.update({
      where: { id: profile.id },
      data: {
        ...(profile.deleted_at === null ? { deleted_at: now } : {}),
        updated_at: now,
      },
    });
  });
}
