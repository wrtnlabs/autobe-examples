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

export async function getHrmPlatformMemberProfile(props: {
  member: MemberPayload;
}): Promise<IHrmPlatformUserProfile> {
  const record =
    await MyGlobal.prisma.hrm_platform_user_profiles.findFirstOrThrow({
      where: {
        hrm_platform_member_id: props.member.id,
        deleted_at: null,
      },
      ...HrmPlatformUserProfileTransformer.select(),
    });
  return await HrmPlatformUserProfileTransformer.transform(record);
}
