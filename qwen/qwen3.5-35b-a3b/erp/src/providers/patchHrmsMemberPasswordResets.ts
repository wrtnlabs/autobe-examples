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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberPasswordResets(props: {
  member: MemberPayload;
  body: IHrmsMember.IChangePassword;
}): Promise<IHrmsMember> {
  // Step 1: Validate member account exists and is not soft-deleted
  const existingMember = await MyGlobal.prisma.hrms_members.findUniqueOrThrow({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
  });
  // Step 2: Validate current password using bcrypt.compare
  const passwordValid = await bcrypt.compare(
    props.body.currentPassword,
    existingMember.password_hash,
  );
  if (!passwordValid) {
    throw new HttpException("Current password is incorrect", 400);
  }
  // Step 3: Hash new password with bcrypt (salt rounds of 12)
  const newPasswordHash = await bcrypt.hash(props.body.newPassword, 12);
  await MyGlobal.prisma.hrms_members.update({
    where: { id: props.member.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: new Date(),
    },
  });
  // Step 4: Invalidate all active sessions
  await MyGlobal.prisma.hrms_member_sessions.updateMany({
    where: {
      hrms_member_id: props.member.id,
      expired_at: { gt: new Date() },
    },
    data: {
      expired_at: new Date(Date.now() - 1),
    },
  });
  // Step 5: Create audit record in password_resets
  const resetToken: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  await MyGlobal.prisma.hrms_member_password_resets.create({
    data: {
      id: resetToken,
      hrms_member_id: props.member.id,
      token: resetToken,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      used_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Step 6 & 7: Query and transform for response
  const memberWithRelations =
    await MyGlobal.prisma.hrms_members.findUniqueOrThrow({
      where: { id: props.member.id },
      ...HrmsMemberTransformer.select(),
    });
  return await HrmsMemberTransformer.transform(memberWithRelations);
}
