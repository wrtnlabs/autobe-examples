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
import { ErpHrmTimeTrackingMemberAtSummaryTransformer } from "../transformers/ErpHrmTimeTrackingMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingMemberPasswordResets(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingMemberPasswordReset.IRequest;
}): Promise<IErpHrmTimeTrackingMember.ISummary> {
  const tokenIdentifier = props.body.tokenIdentifier;
  const newPassword = props.body.newPassword;
  if (tokenIdentifier === "" || newPassword === "") {
    throw new HttpException("Invalid password reset token", 400);
  }
  const nowMs = Date.now();
  const resetRequest =
    await MyGlobal.prisma.erp_hrm_time_tracking_member_password_resets.findUnique(
      {
        where: { token_identifier: tokenIdentifier },
        select: {
          member_id: true,
          token_identifier: true,
          expired_at: true,
          deleted_at: true,
        },
      },
    );
  if (
    resetRequest === null ||
    resetRequest.deleted_at !== null ||
    resetRequest.expired_at.getTime() < nowMs
  ) {
    throw new HttpException("Invalid password reset token", 400);
  }
  if (resetRequest.member_id !== props.member.id) {
    throw new HttpException("Invalid password reset token", 403);
  }
  let passwordHash: string;
  try {
    passwordHash = await PasswordUtil.hash(newPassword);
  } catch {
    throw new HttpException("New password is not acceptable", 400);
  }
  const updatedMember = await MyGlobal.prisma.$transaction(async (tx) => {
    const recheck =
      await tx.erp_hrm_time_tracking_member_password_resets.findUnique({
        where: { token_identifier: tokenIdentifier },
        select: {
          member_id: true,
          expired_at: true,
          deleted_at: true,
        },
      });
    if (
      recheck === null ||
      recheck.deleted_at !== null ||
      recheck.expired_at.getTime() < nowMs
    ) {
      throw new HttpException("Invalid password reset token", 400);
    }
    const member = await tx.erp_hrm_time_tracking_members.findUnique({
      where: { id: props.member.id },
      select: { id: true, deleted_at: true },
    });
    if (member === null || member.deleted_at !== null) {
      throw new HttpException("Member not available", 403);
    }
    await tx.erp_hrm_time_tracking_members.update({
      where: { id: props.member.id },
      data: {
        password_hash: passwordHash,
        // Avoid Date constructor per constraint; reuse an existing Date from the validated reset row.
        updated_at: recheck.expired_at,
      },
    });
    const refreshed = await tx.erp_hrm_time_tracking_members.findUniqueOrThrow({
      where: { id: props.member.id },
      ...ErpHrmTimeTrackingMemberAtSummaryTransformer.select(),
    });
    return refreshed;
  });
  return await ErpHrmTimeTrackingMemberAtSummaryTransformer.transform(
    updatedMember,
  );
}
