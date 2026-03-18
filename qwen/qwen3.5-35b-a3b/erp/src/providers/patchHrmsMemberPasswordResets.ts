import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsMemberTransformer } from "../transformers/HrmsMemberTransformer";
import { HrmsOrganizationMemberAtSummaryTransformer } from "../transformers/HrmsOrganizationMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberPasswordResets(props: {
  member: MemberPayload;
  body: IHrmsMember.IChangePassword;
}): Promise<IHrmsMember> {
  const { member, body } = props;
  // 1. Query and verify member exists and is not deleted
  const record = await MyGlobal.prisma.hrms_members.findUniqueOrThrow({
    where: {
      id: member.id,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      display_name: true,
      avatar_uri: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      organizationMembers: HrmsOrganizationMemberAtSummaryTransformer.select(),
    },
  });
  if (record.deleted_at !== null) {
    throw new HttpException("Account deleted", 403);
  }
  // 2. Validate current password using PasswordUtil
  const currentPasswordValid = await PasswordUtil.verify(
    body.currentPassword,
    record.password_hash,
  );
  if (!currentPasswordValid) {
    throw new HttpException("Current password is incorrect", 400);
  }
  // 3. Validate new password requirements
  const passwordErrors: string[] = [];
  if (body.newPassword.length < 8) {
    passwordErrors.push("Password must be at least 8 characters");
  }
  if (!/[A-Z]/.test(body.newPassword)) {
    passwordErrors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(body.newPassword)) {
    passwordErrors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(body.newPassword)) {
    passwordErrors.push("Password must contain at least one digit");
  }
  if (!/[!@#$%^&*(),."{}|<>]/.test(body.newPassword)) {
    passwordErrors.push("Password must contain at least one special character");
  }
  if (passwordErrors.length > 0) {
    throw new HttpException(passwordErrors.join(", "), 400);
  }
  // 4. Hash new password using PasswordUtil
  const newHash = await PasswordUtil.hash(body.newPassword);
  // 5. Update member record
  await MyGlobal.prisma.hrms_members.update({
    where: {
      id: member.id,
    },
    data: {
      password_hash: newHash,
      updated_at: new Date(),
    },
  });
  // 6. Invalidate all active sessions
  await MyGlobal.prisma.hrms_member_sessions.updateMany({
    where: {
      hrms_member_id: member.id,
      expired_at: {
        gt: new Date(),
      },
    },
    data: {
      expired_at: new Date("1970-01-01T00:00:00Z"),
    },
  });
  // 7. Create audit trail record
  const resetToken = v4() as string & tags.Format<"uuid">;
  const now = new Date();
  await MyGlobal.prisma.hrms_member_password_resets.create({
    data: {
      id: resetToken,
      hrms_member_id: member.id,
      token: resetToken,
      expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      used_at: null,
      updated_at: now,
      created_at: now,
    },
  });
  // 8. Query and return updated member with organization memberships
  const finalRecord = await MyGlobal.prisma.hrms_members.findUniqueOrThrow({
    where: {
      id: member.id,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_uri: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
      memberSessions: true,
      files: true,
      fileUploads: true,
      passwordResets: true,
      emailVerifications: true,
      activityLogsPerformeds: true,
      ownedOrganizations: true,
      organizationMembers: HrmsOrganizationMemberAtSummaryTransformer.select(),
      taskStatusHistories: true,
      reviewedTimesheets: true,
    },
  });
  return HrmsMemberTransformer.transform(finalRecord);
}
