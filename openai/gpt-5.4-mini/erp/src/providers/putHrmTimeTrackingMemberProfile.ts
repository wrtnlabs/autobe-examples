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
import { HrmTimeTrackingUserProfileTransformer } from "../transformers/HrmTimeTrackingUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingMemberProfile(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingUserProfile.IUpdate;
}): Promise<IHrmTimeTrackingUserProfile> {
  const existing =
    await MyGlobal.prisma.hrm_time_tracking_user_profiles.findFirst({
      where: {
        hrm_time_tracking_user_account_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_time_tracking_user_account_id: true,
      },
    });
  if (existing === null) {
    throw new HttpException("Profile not found", 404);
  }
  if (existing.hrm_time_tracking_user_account_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.hrm_time_tracking_user_profiles.update({
    where: {
      id: existing.id,
    },
    data: {
      ...(props.body.displayName !== undefined
        ? { display_name: props.body.displayName }
        : {}),
      ...(props.body.avatarImageUrl !== undefined
        ? { avatar_image_url: props.body.avatarImageUrl }
        : {}),
      ...(props.body.phoneNumber !== undefined
        ? { phone_number: props.body.phoneNumber }
        : {}),
      updated_at: new globalThis.Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_user_profiles.findUniqueOrThrow({
      where: {
        id: existing.id,
      },
      ...HrmTimeTrackingUserProfileTransformer.select(),
    });
  return await HrmTimeTrackingUserProfileTransformer.transform(updated);
}
