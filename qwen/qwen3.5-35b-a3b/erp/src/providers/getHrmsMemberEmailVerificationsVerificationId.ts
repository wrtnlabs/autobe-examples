import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsMemberEmailVerificationTransformer } from "../transformers/HrmsMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmsMemberEmailVerificationsVerificationId(props: {
  member: MemberPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IHrmsMemberEmailVerification> {
  const verification =
    await MyGlobal.prisma.hrms_member_email_verifications.findUniqueOrThrow({
      where: {
        id: props.verificationId,
        deleted_at: null,
      },
      ...HrmsMemberEmailVerificationTransformer.select(),
    });
  const targetMember = await MyGlobal.prisma.hrms_members.findUniqueOrThrow({
    where: { id: verification.member.id },
    select: { id: true, deleted_at: true },
  });
  if (targetMember.deleted_at !== null) {
    throw new HttpException("Target member account is deleted", 404);
  }
  const requesterOrgMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        member: { id: props.member.id },
        deleted_at: null,
      },
      select: {
        organization: { select: { id: true } },
        hrms_organization_role_id: true,
      },
    });
  if (requesterOrgMember === null) {
    throw new HttpException("No organization context", 403);
  }
  const requesterRole = await MyGlobal.prisma.hrms_organization_roles.findFirst(
    {
      where: {
        id: requesterOrgMember.hrms_organization_role_id,
        organization_id: requesterOrgMember.organization.id,
      },
      select: { id: true },
    },
  );
  if (requesterRole === null) {
    throw new HttpException("Invalid role", 403);
  }
  const permissions =
    await MyGlobal.prisma.hrms_organization_role_permissions.findMany({
      where: {
        hrms_organization_role_id: requesterRole.id,
      },
      select: { permission: true },
    });
  const hasEmailManagePermission = permissions.some(
    (p) => p.permission === "email:manage",
  );
  if (!hasEmailManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  const targetOrgMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        member: { id: targetMember.id },
        hrms_organization_id: requesterOrgMember.organization.id,
        deleted_at: null,
      },
    });
  if (targetOrgMember === null) {
    throw new HttpException(
      "Verification belongs to member outside organization",
      403,
    );
  }
  return await HrmsMemberEmailVerificationTransformer.transform(verification);
}
