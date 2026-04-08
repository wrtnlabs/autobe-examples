import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeMemberTransformer } from "../transformers/ErpHrmTimeMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeMemberProfile(props: {
  member: MemberPayload;
  body: IErpHrmTimeMember.IUpdate;
}): Promise<IErpHrmTimeMember> {
  if (
    props.body.displayName !== undefined &&
    props.body.displayName.length === 0
  ) {
    throw new HttpException("Display name must not be empty", 400);
  }
  await MyGlobal.prisma.erp_hrm_time_members.update({
    where: {
      id: props.member.id,
    },
    data: {
      ...(props.body.displayName !== undefined && {
        display_name: props.body.displayName,
      }),
      ...(props.body.avatarImageUrl !== undefined && {
        avatar_image_url: props.body.avatarImageUrl,
      }),
      ...(props.body.phoneNumber !== undefined && {
        phone_number: props.body.phoneNumber,
      }),
      updated_at: new Date(),
    },
  });
  const member = await MyGlobal.prisma.erp_hrm_time_members.findUniqueOrThrow({
    where: {
      id: props.member.id,
    },
    ...ErpHrmTimeMemberTransformer.select(),
  });
  return await ErpHrmTimeMemberTransformer.transform(member);
}
