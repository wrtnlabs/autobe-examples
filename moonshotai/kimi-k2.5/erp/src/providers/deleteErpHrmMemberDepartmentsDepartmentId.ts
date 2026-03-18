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

export async function deleteErpHrmMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Get organization member with role permissions for authorization
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        is_active: true,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        role: {
          select: {
            rolePermissions: {
              select: {
                permission: true,
              },
            },
          },
        },
      },
    });
  if (orgMember === null) {
    throw new HttpException("Organization member not found", 404);
  }
  // Verify org:manage permission
  const hasManagePermission = orgMember.role.rolePermissions.some(
    (rp: { permission: string }) => rp.permission === "org:manage",
  );
  if (!hasManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify department exists and belongs to this organization
  const department = await MyGlobal.prisma.erp_hrm_departments.findUnique({
    where: {
      id: props.departmentId,
    },
    select: {
      id: true,
      organization_id: true,
      deleted_at: true,
    },
  });
  if (department === null || department.deleted_at !== null) {
    throw new HttpException("Department not found", 404);
  }
  if (department.organization_id !== orgMember.organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  // Cascade: Clear department assignments for employees
  await MyGlobal.prisma.erp_hrm_organization_members.updateMany({
    where: {
      department_id: props.departmentId,
    },
    data: {
      department_id: null,
    },
  });
  // Cascade: Clear parent reference for child departments (make them top-level)
  await MyGlobal.prisma.erp_hrm_departments.updateMany({
    where: {
      parent_department_id: props.departmentId,
    },
    data: {
      parent_department_id: null,
    },
  });
  // Soft delete: Mark department as deleted
  await MyGlobal.prisma.erp_hrm_departments.update({
    where: {
      id: props.departmentId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
