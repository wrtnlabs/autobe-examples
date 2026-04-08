import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformUserProfileTransformer } from "../transformers/HrmPlatformUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberProfile(props: {
  member: MemberPayload;
  body: IHrmPlatformUserProfile.IUpdate;
}): Promise<IHrmPlatformUserProfile> {
  // Fetch current profile to validate changes
  const current =
    await MyGlobal.prisma.hrm_platform_user_profiles.findUniqueOrThrow({
      where: {
        hrm_platform_member_id: props.member.id,
        deleted_at: null,
      },
    });
  // Validate at least one field is provided and different from current values
  const hasDisplayNameChange =
    props.body.display_name !== undefined &&
    props.body.display_name !== current.display_name;
  const hasAvatarUrlChange =
    props.body.avatar_url !== undefined &&
    props.body.avatar_url !== current.avatar_url;
  const hasPhoneNumberChange =
    props.body.phone_number !== undefined &&
    props.body.phone_number !== current.phone_number;
  if (!hasDisplayNameChange && !hasAvatarUrlChange && !hasPhoneNumberChange) {
    throw new HttpException("No changes provided", 400);
  }
  // Validate display_name not empty if provided (business rule from section 69)
  if (
    props.body.display_name !== undefined &&
    props.body.display_name.trim().length === 0
  ) {
    throw new HttpException("Display name cannot be empty", 400);
  }
  // Build update data with only changed fields
  await MyGlobal.prisma.hrm_platform_user_profiles.update({
    where: {
      hrm_platform_member_id: props.member.id,
      deleted_at: null,
    },
    data: {
      ...(hasDisplayNameChange && { display_name: props.body.display_name }),
      ...(hasAvatarUrlChange && { avatar_url: props.body.avatar_url }),
      ...(hasPhoneNumberChange && { phone_number: props.body.phone_number }),
      updated_at: new Date(),
    },
  });
  // Fetch updated profile using transformer select
  const updated =
    await MyGlobal.prisma.hrm_platform_user_profiles.findUniqueOrThrow({
      where: {
        hrm_platform_member_id: props.member.id,
        deleted_at: null,
      },
      ...HrmPlatformUserProfileTransformer.select(),
    });
  return await HrmPlatformUserProfileTransformer.transform(updated);
}
