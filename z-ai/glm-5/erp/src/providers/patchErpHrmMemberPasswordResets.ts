import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberPasswordResets(props: {
  member: MemberPayload;
  body: IErpHrmMemberPasswordReset.IRequest;
}): Promise<void> {
  const member = await MyGlobal.prisma.erp_hrm_members.findUnique({
    where: { email: props.body.email },
  });
  if (member !== null) {
    const token = v4();
    const hashedToken = await PasswordUtil.hash(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await MyGlobal.prisma.erp_hrm_member_password_resets.create({
      data: {
        id: v4(),
        member_id: member.id,
        token: hashedToken,
        created_at: new Date(),
        expired_at: expiresAt,
      },
    });
  }
}
