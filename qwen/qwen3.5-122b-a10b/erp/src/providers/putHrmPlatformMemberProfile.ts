import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformMemberTransformer } from "../transformers/HrmPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberProfile(props: {
  member: MemberPayload;
  body: IHrmPlatformMember.IUpdate;
}): Promise<IHrmPlatformMember> {
  // Verify member exists and is not soft-deleted
  await MyGlobal.prisma.hrm_platform_members.findUniqueOrThrow({
    where: { id: props.member.id },
  });
  // Update the member profile with only provided fields
  await MyGlobal.prisma.hrm_platform_members.update({
    where: { id: props.member.id },
    data: {
      display_name: props.body.displayName,
      ...(props.body.avatarImage !== undefined && {
        avatar_image: props.body.avatarImage ?? null,
      }),
      ...(props.body.phoneNumber !== undefined && {
        phone_number: props.body.phoneNumber ?? null,
      }),
      updated_at: new Date(),
    },
  });
  // Retrieve and transform the updated member
  const updated = await MyGlobal.prisma.hrm_platform_members.findUniqueOrThrow({
    where: { id: props.member.id },
    ...HrmPlatformMemberTransformer.select(),
  });
  return await HrmPlatformMemberTransformer.transform(updated);
}
