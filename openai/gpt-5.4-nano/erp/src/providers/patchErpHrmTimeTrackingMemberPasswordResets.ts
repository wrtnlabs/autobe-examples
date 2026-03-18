import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMemberPasswordReset";
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

export async function patchErpHrmTimeTrackingMemberPasswordResets(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingMemberPasswordReset.IRequest;
}): Promise<IErpHrmTimeTrackingMember.ISummary> {
  const memberId = props.member.id;
  const tokenIdentifier = props.body.tokenIdentifier;
  const reset =
    await MyGlobal.prisma.erp_hrm_time_tracking_member_password_resets.findUnique(
      {
        where: { token_identifier: tokenIdentifier },
        select: {
          id: true,
          member_id: true,
          expired_at: true,
          deleted_at: true,
        },
      },
    );
  if (reset === null) {
    throw new HttpException("Invalid password reset token", 400);
  }
  if (reset.member_id !== memberId) {
    throw new HttpException("Invalid password reset token", 400);
  }
  if (reset.deleted_at !== null) {
    throw new HttpException("Password reset token is no longer valid", 400);
  }
  const expiredAtMs = reset.expired_at.getTime();
  const nowMs = Date.now();
  if (nowMs > expiredAtMs) {
    throw new HttpException("Password reset token has expired", 400);
  }
  const hashed = await (async () => {
    const pu = PasswordUtil as unknown as {
      hashPassword?: (password: string) => Promise<string>;
      hash?: (password: string) => Promise<string>;
      encode?: (password: string) => Promise<string>;
      encrypt?: (password: string) => Promise<string>;
    };
    if (typeof pu.hashPassword === "function")
      return await pu.hashPassword(props.body.newPassword);
    if (typeof pu.hash === "function")
      return await pu.hash(props.body.newPassword);
    if (typeof pu.encode === "function")
      return await pu.encode(props.body.newPassword);
    if (typeof pu.encrypt === "function")
      return await pu.encrypt(props.body.newPassword);
    throw new Error("PasswordUtil hashing function is not available");
  })();
  const updatedMember = await MyGlobal.prisma.$transaction(async (prisma) => {
    const resetInTx =
      await prisma.erp_hrm_time_tracking_member_password_resets.findUnique({
        where: { token_identifier: tokenIdentifier },
        select: {
          id: true,
          member_id: true,
          expired_at: true,
          deleted_at: true,
        },
      });
    if (resetInTx === null) {
      throw new HttpException("Invalid password reset token", 400);
    }
    if (resetInTx.member_id !== memberId) {
      throw new HttpException("Invalid password reset token", 400);
    }
    if (resetInTx.deleted_at !== null) {
      throw new HttpException("Password reset token is no longer valid", 400);
    }
    if (Date.now() > resetInTx.expired_at.getTime()) {
      throw new HttpException("Password reset token has expired", 400);
    }
    const nowIso = toISOStringSafe(new Date());
    await prisma.erp_hrm_time_tracking_members.update({
      where: { id: memberId },
      data: {
        password_hash: hashed,
        updated_at: nowIso,
      },
    });
    await prisma.erp_hrm_time_tracking_member_password_resets.update({
      where: { id: resetInTx.id },
      data: {
        deleted_at: nowIso,
        updated_at: nowIso,
      },
    });
    return await prisma.erp_hrm_time_tracking_members.findUniqueOrThrow({
      where: { id: memberId },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  });
  return {
    id: updatedMember.id,
    email: updatedMember.email,
    created_at: toISOStringSafe(updatedMember.created_at),
    updated_at: toISOStringSafe(updatedMember.updated_at),
    deleted_at:
      updatedMember.deleted_at === null
        ? null
        : toISOStringSafe(updatedMember.deleted_at),
  };
}
