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
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.avatar_image !== undefined && {
        avatar_image: props.body.avatar_image,
      }),
      ...(props.body.phone_number !== undefined && {
        phone_number: props.body.phone_number,
      }),
      updated_at: new Date(),
    },
    ...ErpHrmMemberTransformer.select(),
  });
  return ErpHrmMemberTransformer.transform(updated);
}
