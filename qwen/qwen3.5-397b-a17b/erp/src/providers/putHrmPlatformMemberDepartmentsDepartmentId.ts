import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentTransformer } from "../transformers/HrmPlatformDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IHrmPlatformDepartment.IUpdate;
}): Promise<IHrmPlatformDepartment> {
  // Fetch the department and verify it exists and is not deleted
  const department =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: { id: props.departmentId, deleted_at: null },
      select: {
        id: true,
        hrm_platform_organization_id: true,
        parent_id: true,
      },
    });
  // Verify member has org:manage permission in this organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      organization_id: department.hrm_platform_organization_id,
      deleted_at: null,
    },
    select: {
      role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: employee.role_id },
    select: {
      name: true,
      built_in: true,
    },
  });
  if (!role) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if role is built-in owner/manager or has org:manage permission
  const isBuiltInOwnerOrManager =
    role.built_in && (role.name === "Owner" || role.name === "Manager");
  let hasOrgManage = isBuiltInOwnerOrManager;
  if (!hasOrgManage) {
    const orgManagePermission =
      await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
        where: {
          role_id: employee.role_id,
          permission: "org:manage",
          deleted_at: null,
        },
      });
    hasOrgManage = orgManagePermission !== null;
  }
  if (!hasOrgManage) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate name uniqueness if name is being updated
  if (props.body.name !== undefined) {
    const existingName =
      await MyGlobal.prisma.hrm_platform_departments.findFirst({
        where: {
          hrm_platform_organization_id: department.hrm_platform_organization_id,
          name: props.body.name,
          id: { not: props.departmentId },
          deleted_at: null,
        },
      });
    if (existingName) {
      throw new HttpException(
        "Department name already exists in this organization",
        409,
      );
    }
  }
  // Validate parent_id constraints if parent_id is being updated
  if (props.body.parent_id !== undefined) {
    if (props.body.parent_id === null) {
      // Setting to null is valid (top-level department)
    } else {
      // Verify parent exists in same organization and is not self
      if (props.body.parent_id === props.departmentId) {
        throw new HttpException("Department cannot be its own parent", 400);
      }
      const parent = await MyGlobal.prisma.hrm_platform_departments.findUnique({
        where: { id: props.body.parent_id, deleted_at: null },
        select: {
          hrm_platform_organization_id: true,
          parent_id: true,
        },
      });
      if (!parent) {
        throw new HttpException("Parent department not found", 400);
      }
      if (
        parent.hrm_platform_organization_id !==
        department.hrm_platform_organization_id
      ) {
        throw new HttpException(
          "Parent department must be in the same organization",
          400,
        );
      }
      // Validate one-level hierarchy: parent must not have a parent
      if (parent.parent_id !== null) {
        throw new HttpException(
          "Parent department must be a top-level department (one-level hierarchy)",
          400,
        );
      }
    }
  }
  // Perform the update
  await MyGlobal.prisma.hrm_platform_departments.update({
    where: { id: props.departmentId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.parent_id !== undefined && {
        parent_id: props.body.parent_id,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch and return the updated department
  const updated =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      ...HrmPlatformDepartmentTransformer.select(),
    });
  return await HrmPlatformDepartmentTransformer.transform(updated);
}
