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
  const updated = await MyGlobal.prisma.hrm_platform_members.update({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.avatar_url !== undefined && {
        avatar_url: props.body.avatar_url,
      }),
      ...(props.body.phone_number !== undefined && {
        phone_number: props.body.phone_number,
      }),
      updated_at: new Date(),
    },
    ...HrmPlatformMemberTransformer.select(),
  });
  if (props.body.display_name !== undefined) {
    await MyGlobal.prisma.hrm_platform_employees.updateMany({
      where: {
        member_id: props.member.id,
      },
      data: {
        display_name: props.body.display_name,
      },
    });
  }
  return await HrmPlatformMemberTransformer.transform(updated);
}
