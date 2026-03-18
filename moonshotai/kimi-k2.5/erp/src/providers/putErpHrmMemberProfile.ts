import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmMemberTransformer } from "../transformers/ErpHrmMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberProfile(props: {
  member: MemberPayload;
  body: IErpHrmMember.IUpdate;
}): Promise<IErpHrmMember> {
  const updated = await MyGlobal.prisma.erp_hrm_members.update({
    where: { id: props.member.id },
    data: {
      ...(props.body.firstName !== undefined && {
        first_name: props.body.firstName,
      }),
      ...(props.body.lastName !== undefined && {
        last_name: props.body.lastName,
      }),
      ...(props.body.avatarUrl !== undefined && {
        avatar_url: props.body.avatarUrl,
      }),
      ...(props.body.timezone !== undefined && {
        timezone: props.body.timezone,
      }),
      ...(props.body.locale !== undefined && { locale: props.body.locale }),
      updated_at: new Date(),
    },
    ...ErpHrmMemberTransformer.select(),
  });
  return await ErpHrmMemberTransformer.transform(updated);
}
