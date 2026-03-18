import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmOrganizationMemberTransformer } from "../transformers/ErpHrmOrganizationMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberOrganizationMembersOrganizationMemberId(props: {
  member: MemberPayload;
  organizationMemberId: string;
}): Promise<IErpHrmOrganizationMember> {
  // Get the requesting member's organization membership to determine organization context
  const requestingMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        deleted_at: null,
        is_active: true,
      },
      select: {
        id: true,
        organization_id: true,
        role: {
          select: {
            rolePermissions: {
              select: { permission: true },
            },
          },
        },
      },
    });
  if (!requestingMember) {
    throw new HttpException(
      "Forbidden - Not a member of any organization",
      403,
    );
  }
  // Query the target organization member with all nested relations
  const organizationMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        id: props.organizationMemberId,
        organization_id: requestingMember.organization_id,
        deleted_at: null,
      },
      ...ErpHrmOrganizationMemberTransformer.select(),
    });
  if (!organizationMember) {
    throw new HttpException("Organization member not found", 404);
  }
  // Check for employee:manage permission
  const hasManagePermission =
    requestingMember.role?.rolePermissions.some(
      (rp: { permission: string }) => rp.permission === "employee:manage",
    ) ?? false;
  // Allow access if has employee:manage permission or is accessing own record
  const isSelfAccess = organizationMember.user.id === props.member.id;
  if (!hasManagePermission && !isSelfAccess) {
    throw new HttpException(
      "Forbidden - Insufficient permissions to view this member",
      403,
    );
  }
  // Transform and return the result
  return await ErpHrmOrganizationMemberTransformer.transform(
    organizationMember,
  );
}
