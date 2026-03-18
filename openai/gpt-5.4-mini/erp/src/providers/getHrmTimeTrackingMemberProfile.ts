import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { IHrmTimeTrackingUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserProfile";
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

export async function getHrmTimeTrackingMemberProfile(props: {
  member: MemberPayload;
}): Promise<IHrmTimeTrackingUserProfile> {
  const profile =
    await MyGlobal.prisma.hrm_time_tracking_user_profiles.findUniqueOrThrow({
      where: {
        hrm_time_tracking_user_account_id: props.member.id,
      },
      select: {
        id: true,
        display_name: true,
        avatar_image_url: true,
        phone_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: profile.id,
    userAccount: {},
    displayName: profile.display_name,
    avatarImageUrl: null,
    phoneNumber: profile.phone_number ?? null,
    createdAt: toISOStringSafe(profile.created_at),
    updatedAt: toISOStringSafe(profile.updated_at),
    deletedAt: profile.deleted_at?.toISOString() ?? null,
  } satisfies IHrmTimeTrackingUserProfile;
}
