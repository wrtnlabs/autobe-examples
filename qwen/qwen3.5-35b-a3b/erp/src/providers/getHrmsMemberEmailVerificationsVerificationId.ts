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
      where: { id: props.verificationId },
      ...HrmsMemberEmailVerificationTransformer.select(),
    });
  if (verification.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const member = verification.member;
  const memberOrganizationMembers =
    await MyGlobal.prisma.hrms_organization_members.findMany({
      where: { hrms_member_id: member.id },
      include: {
        organization: true,
      },
    });
  const requestingMemberOrganizationMembers =
    await MyGlobal.prisma.hrms_organization_members.findMany({
      where: { hrms_member_id: props.member.id },
      include: {
        organization: true,
      },
    });
  const targetOrganization = memberOrganizationMembers.find(
    (om) => om.organization.owner_id === props.member.id,
  );
  if (!targetOrganization) {
    throw new HttpException("Forbidden", 403);
  }
  const verificationBelongsToOrganization = memberOrganizationMembers.some(
    (om) => om.hrms_organization_id === targetOrganization.organization.id,
  );
  if (!verificationBelongsToOrganization) {
    throw new HttpException("Forbidden", 403);
  }
  const requestingMembership = requestingMemberOrganizationMembers.find(
    (om) => om.hrms_organization_id === targetOrganization.organization.id,
  );
  if (!requestingMembership) {
    throw new HttpException("Forbidden", 403);
  }
  const hasPermission = true;
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmsMemberEmailVerificationTransformer.transform(verification);
}
