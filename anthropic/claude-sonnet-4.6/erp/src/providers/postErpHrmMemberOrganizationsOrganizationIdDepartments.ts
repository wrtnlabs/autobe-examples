import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmDepartmentCollector } from "../collectors/ErpHrmDepartmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmDepartmentTransformer } from "../transformers/ErpHrmDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberOrganizationsOrganizationIdDepartments(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmDepartment.ICreate;
}): Promise<IErpHrmDepartment> {
  // Step 1: Verify member belongs to the organization
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: props.organizationId,
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  if (orgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Verify the member's role has 'organization manage' permission
  const permissionRecord =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        role_id: orgMember.role_id,
      },
      select: { id: true },
    });
  if (permissionRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Confirm the organization exists and is not deleted
  const organization =
    await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: { id: true, deleted_at: true },
    });
  if (organization.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Step 4: Check name uniqueness within the organization
  const existingDept = await MyGlobal.prisma.erp_hrm_departments.findFirst({
    where: {
      organization_id: props.organizationId,
      name: props.body.name,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existingDept !== null) {
    throw new HttpException(
      "Conflict: A department with this name already exists in the organization",
      409,
    );
  }
  // Step 5: Validate parentId if provided
  if (props.body.parentId != null) {
    const parentDept = await MyGlobal.prisma.erp_hrm_departments.findFirst({
      where: {
        id: props.body.parentId,
        organization_id: props.organizationId,
        deleted_at: null,
      },
      select: { id: true, parent_id: true },
    });
    if (parentDept === null) {
      throw new HttpException(
        "Not Found: Parent department does not exist in this organization",
        404,
      );
    }
    if (parentDept.parent_id !== null) {
      throw new HttpException(
        "Unprocessable Entity: The referenced parent department is already a child department",
        422,
      );
    }
  }
  // Step 6: Create the department
  const created = await MyGlobal.prisma.erp_hrm_departments.create({
    data: await ErpHrmDepartmentCollector.collect({
      body: props.body,
      erpHrmOrganizations: { id: props.organizationId },
      erpHrmMembers: { id: props.member.id },
      erpHrmMemberSessions: { id: props.member.session_id },
    }),
    ...ErpHrmDepartmentTransformer.select(),
  });
  // Step 7: Return the transformed result
  return ErpHrmDepartmentTransformer.transform(created);
}
