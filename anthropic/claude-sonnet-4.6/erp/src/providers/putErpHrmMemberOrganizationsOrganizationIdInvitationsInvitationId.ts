import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmInvitationTransformer } from "../transformers/ErpHrmInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberOrganizationsOrganizationIdInvitationsInvitationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  invitationId: string & tags.Format<"uuid">;
  body: IErpHrmInvitation.IUpdate;
}): Promise<IErpHrmInvitation> {
  // Step 1: Verify the member belongs to the organization and is active
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: props.organizationId,
        status: "active",
      },
      select: { id: true },
    });
  if (orgMember === null) {
    throw new HttpException(
      "Forbidden: you do not belong to this organization or your account is inactive",
      403,
    );
  }
  // Step 2: Verify the organization exists and is not soft-deleted
  await MyGlobal.prisma.erp_hrm_organizations.findFirstOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 3: Fetch the invitation scoped to the organization (404 if not found or mismatched org)
  const invitation = await MyGlobal.prisma.erp_hrm_invitations.findFirstOrThrow(
    {
      where: {
        id: props.invitationId,
        erp_hrm_organization_id: props.organizationId,
      },
      select: { id: true, status: true },
    },
  );
  // Step 4: Validate status transition
  // Only 'pending' invitations may be updated via this endpoint
  if (invitation.status !== "pending") {
    throw new HttpException(
      `Unprocessable: invitation is already in a terminal state '${invitation.status}' and cannot be transitioned`,
      422,
    );
  }
  // Only allowed target statuses: cancelled, rejected, expired
  const allowedNewStatuses = ["cancelled", "rejected", "expired"];
  if (!allowedNewStatuses.includes(props.body.status)) {
    throw new HttpException(
      `Unprocessable: invalid status transition from 'pending' to '${props.body.status}'. Allowed target statuses are: cancelled, rejected, expired`,
      422,
    );
  }
  // Step 5: Apply the status update
  await MyGlobal.prisma.erp_hrm_invitations.update({
    where: { id: props.invitationId },
    data: {
      status: props.body.status,
      updated_at: new Date(),
    },
  });
  // Step 6: Re-fetch and return the updated record using the transformer
  const updated = await MyGlobal.prisma.erp_hrm_invitations.findUniqueOrThrow({
    where: { id: props.invitationId },
    ...ErpHrmInvitationTransformer.select(),
  });
  return ErpHrmInvitationTransformer.transform(updated);
}
