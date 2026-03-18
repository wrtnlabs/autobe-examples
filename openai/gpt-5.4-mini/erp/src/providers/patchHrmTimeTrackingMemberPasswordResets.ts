import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingMemberTransformer } from "../transformers/HrmTimeTrackingMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberPasswordResets(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingMember.IResetPassword;
}): Promise<IHrmTimeTrackingMember> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const reset =
      await prisma.hrm_time_tracking_member_password_resets.findUniqueOrThrow({
        where: {
          token: props.body.token,
        },
        select: {
          id: true,
          member_id: true,
          expires_at: true,
          consumed_at: true,
        },
      });
    if (reset.member_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (reset.consumed_at !== null) {
      throw new HttpException("Password reset token already used", 400);
    }
    if (reset.expires_at.getTime() <= new Date().getTime()) {
      throw new HttpException("Password reset token expired", 400);
    }
    const member = await prisma.hrm_time_tracking_members.findUniqueOrThrow({
      where: {
        id: reset.member_id,
      },
      select: {
        id: true,
        is_active: true,
      },
    });
    if (member.is_active === false) {
      throw new HttpException("Member account is inactive", 403);
    }
    const password_hash = await PasswordUtil.hash(props.body.password);
    await prisma.hrm_time_tracking_members.update({
      where: {
        id: reset.member_id,
      },
      data: {
        password_hash,
        updated_at: new Date(),
      },
    });
    await prisma.hrm_time_tracking_member_password_resets.update({
      where: {
        id: reset.id,
      },
      data: {
        consumed_at: new Date(),
        updated_at: new Date(),
      },
    });
    const updated = await prisma.hrm_time_tracking_members.findUniqueOrThrow({
      where: {
        id: reset.member_id,
      },
      ...HrmTimeTrackingMemberTransformer.select(),
    });
    return await HrmTimeTrackingMemberTransformer.transform(updated);
  });
}
