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
  const member = await MyGlobal.prisma.hrm_platform_members.findUniqueOrThrow({
    where: { id: props.member.id },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Member account is deleted", 403);
  }
  await MyGlobal.prisma.hrm_platform_members.update({
    where: { id: props.member.id },
    data: {
      display_name: props.body.displayName,
      ...(props.body.avatarImage !== undefined && {
        avatar_image: props.body.avatarImage,
      }),
      ...(props.body.phoneNumber !== undefined && {
        phone_number: props.body.phoneNumber,
      }),
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.hrm_platform_members.findUniqueOrThrow({
    where: { id: props.member.id },
    ...HrmPlatformMemberTransformer.select(),
  });
  return await HrmPlatformMemberTransformer.transform(updated);
}
