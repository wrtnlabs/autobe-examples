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

export async function getErpHrmMemberOrganizationsOrganizationIdInvitationsInvitationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  invitationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmInvitation> {
  // Step 1: Verify the authenticated member belongs to the organization and has employee:manage permission
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: props.organizationId,
        status: "active",
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  if (orgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check permission via role_id
  const rolePermissions =
    await MyGlobal.prisma.erp_hrm_role_permissions.findMany({
      where: {
        role_id: orgMember.role_id,
        permission_code: "employee:manage",
      },
      select: {
        permission_code: true,
      },
    });
  const hasPermission = rolePermissions.length > 0;
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Query the invitation scoped to the organization
  const invitation = await MyGlobal.prisma.erp_hrm_invitations.findFirstOrThrow(
    {
      where: {
        id: props.invitationId,
        erp_hrm_organization_id: props.organizationId,
      },
      ...ErpHrmInvitationTransformer.select(),
    },
  );
  // Step 3: Transform and return
  return ErpHrmInvitationTransformer.transform(invitation);
}
