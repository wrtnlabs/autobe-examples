import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
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
import { ErpHrmOrganizationCollector } from "../collectors/ErpHrmOrganizationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmOrganizationTransformer } from "../transformers/ErpHrmOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberOrganizations(props: {
  member: MemberPayload;
  body: IErpHrmOrganization.ICreate;
}): Promise<IErpHrmOrganization> {
  // Check name uniqueness before entering transaction
  const existing = await MyGlobal.prisma.erp_hrm_organizations.findFirst({
    where: {
      name: props.body.name,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existing !== null) {
    throw new HttpException(
      `Organization with name '${props.body.name}' already exists`,
      409,
    );
  }
  // Use transaction for atomicity: create org + roles + owner member
  const organizationId = await MyGlobal.prisma.$transaction(async (tx) => {
    // Collect org creation data via collector
    const orgData = await ErpHrmOrganizationCollector.collect({
      body: props.body,
      erpHrmMembers: { id: props.member.id },
      erpHrmMemberSessions: { id: props.member.session_id },
    });
    // Create the organization record
    const org = await tx.erp_hrm_organizations.create({
      data: orgData,
      select: { id: true },
    });
    // Create the three built-in roles for the new organization
    const ownerRoleId = v4();
    const now = new Date();
    await tx.erp_hrm_roles.createMany({
      data: [
        {
          id: ownerRoleId,
          erp_hrm_organization_id: org.id,
          name: "Owner",
          is_builtin: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: v4(),
          erp_hrm_organization_id: org.id,
          name: "Manager",
          is_builtin: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: v4(),
          erp_hrm_organization_id: org.id,
          name: "Employee",
          is_builtin: true,
          created_at: now,
          updated_at: now,
        },
      ],
    });
    // Create the owner OrganizationMember record for the authenticated member
    await tx.erp_hrm_organization_members.create({
      data: {
        id: v4(),
        organization_id: org.id,
        member_id: props.member.id,
        role_id: ownerRoleId,
        department_id: null,
        employment_type: "full-time",
        status: "active",
        position: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    return org.id;
  });
  // Re-fetch the created org with full transformer payload
  const result = await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
    where: { id: organizationId },
    ...ErpHrmOrganizationTransformer.select(),
  });
  return ErpHrmOrganizationTransformer.transform(result);
}
