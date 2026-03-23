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
  const updateData: any = {
    display_name: props.body.display_name,
    updated_at: new Date(),
  };
  if (props.body.avatar !== undefined) {
    updateData.avatar = props.body.avatar;
  }
  if (props.body.phone_number !== undefined) {
    updateData.phone_number = props.body.phone_number;
  }
  const updated = await MyGlobal.prisma.hrm_platform_members.update({
    where: { id: props.member.id },
    data: updateData,
    ...HrmPlatformMemberTransformer.select(),
  });
  return await HrmPlatformMemberTransformer.transform(updated);
}
