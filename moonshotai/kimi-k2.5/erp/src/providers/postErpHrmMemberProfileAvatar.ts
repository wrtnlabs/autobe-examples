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

export async function postErpHrmMemberProfileAvatar(props: {
  member: MemberPayload;
  body: IErpHrmMember.IAvatarUpload;
}): Promise<IErpHrmMember> {
  const updated = await MyGlobal.prisma.erp_hrm_members.update({
    where: { id: props.member.id },
    data: {
      avatar_url: props.body.avatarUrl,
      updated_at: new Date().toISOString() as unknown as Date,
    },
    ...ErpHrmMemberTransformer.select(),
  });
  return await ErpHrmMemberTransformer.transform(updated);
}
