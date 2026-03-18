import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { ErpHrmRoleTransformer } from "../transformers/ErpHrmRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberOrganizationsOrganizationIdRolesRoleId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
}): Promise<IErpHrmRole> {
  // Step 1: Validate organization exists and is not deleted
  await MyGlobal.prisma.erp_hrm_organizations.findFirstOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Validate calling member is active in the organization
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: props.organizationId,
        member_id: props.member.id,
        deleted_at: null,
        status: "active",
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  if (orgMember === null) {
    throw new HttpException(
      "Forbidden: You are not an active member of this organization",
      403,
    );
  }
  // Step 3: Check that caller's role has employee:manage or org:manage permission
  const permissionCount = await MyGlobal.prisma.erp_hrm_role_permissions.count({
    where: {
      role_id: orgMember.role_id,
      permission_code: { in: ["employee:manage", "org:manage"] },
    },
  });
  if (permissionCount === 0) {
    throw new HttpException(
      "Forbidden: Insufficient permissions to view role details",
      403,
    );
  }
  // Step 4: Fetch the role scoped to the organization
  const role = await MyGlobal.prisma.erp_hrm_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      erp_hrm_organization_id: props.organizationId,
    },
    ...ErpHrmRoleTransformer.select(),
  });
  // Step 5: Transform and return
  return await ErpHrmRoleTransformer.transform(role);
}
