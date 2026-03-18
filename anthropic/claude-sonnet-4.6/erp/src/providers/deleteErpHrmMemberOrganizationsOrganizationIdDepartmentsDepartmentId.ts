import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmMemberOrganizationsOrganizationIdDepartmentsDepartmentId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  departmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify the requesting member belongs to this organization
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
  // Step 2: Check that the member's role has org:manage permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      role_id: orgMember.role_id,
      permission_code: "org:manage",
    },
    select: { id: true },
  });
  if (permission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Find the target department — 404 if not found or already deleted
  await MyGlobal.prisma.erp_hrm_departments.findFirstOrThrow({
    where: {
      id: props.departmentId,
      organization_id: props.organizationId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 4: Execute all changes atomically in a transaction
  await MyGlobal.prisma.$transaction([
    // 4a: Soft-delete the department
    MyGlobal.prisma.erp_hrm_departments.update({
      where: { id: props.departmentId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    }),
    // 4b: Clear department_id on all members previously assigned to this department
    MyGlobal.prisma.erp_hrm_organization_members.updateMany({
      where: { department_id: props.departmentId },
      data: { department_id: null },
    }),
    // 4c: Promote child departments to top-level by clearing their parent_id
    MyGlobal.prisma.erp_hrm_departments.updateMany({
      where: { parent_id: props.departmentId },
      data: { parent_id: null },
    }),
  ]);
}
