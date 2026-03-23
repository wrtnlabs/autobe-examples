import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformDepartmentTransformer } from "../transformers/HrmPlatformDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformAdminDepartmentsDepartmentId(props: {
  admin: AdminPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IHrmPlatformDepartment.IUpdate;
}): Promise<IHrmPlatformDepartment> {
  // Find the department and verify it exists
  const department =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      select: {
        id: true,
        hrm_platform_organization_id: true,
        deleted_at: true,
      },
    });
  // Check if department is soft-deleted
  if (department.deleted_at !== null) {
    throw new HttpException("Department is deleted", 410);
  }
  // Verify the admin has access to this organization through their session
  const adminSession =
    await MyGlobal.prisma.hrm_platform_admin_sessions.findUniqueOrThrow({
      where: { id: props.admin.session_id },
      select: { hrm_platform_admin_id: true },
    });
  const adminRecord =
    await MyGlobal.prisma.hrm_platform_admins.findUniqueOrThrow({
      where: { id: adminSession.hrm_platform_admin_id },
      select: { id: true },
    });
  // Check name uniqueness if provided
  if (props.body.name !== undefined) {
    const existing = await MyGlobal.prisma.hrm_platform_departments.findFirst({
      where: {
        hrm_platform_organization_id: department.hrm_platform_organization_id,
        name: props.body.name,
        id: { not: props.departmentId },
        deleted_at: null,
      },
      select: { id: true },
    });
    if (existing) {
      throw new HttpException("Department name already exists", 409);
    }
  }
  // Validate parent_id hierarchy if provided
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    const parentDept =
      await MyGlobal.prisma.hrm_platform_departments.findUnique({
        where: { id: props.body.parent_id },
        select: {
          parent_id: true,
          hrm_platform_organization_id: true,
          deleted_at: true,
        },
      });
    if (!parentDept) {
      throw new HttpException("Parent department not found", 404);
    }
    if (parentDept.deleted_at !== null) {
      throw new HttpException("Parent department is deleted", 410);
    }
    if (
      parentDept.hrm_platform_organization_id !==
      department.hrm_platform_organization_id
    ) {
      throw new HttpException(
        "Parent department must belong to the same organization",
        403,
      );
    }
    // Enforce one-level hierarchy: parent must be top-level (parent_id must be null)
    if (parentDept.parent_id !== null) {
      throw new HttpException(
        "Parent department must be a top-level department",
        400,
      );
    }
  }
  // Update the department
  const updateData: Prisma.hrm_platform_departmentsUpdateInput = {
    updated_at: new Date(),
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.parent_id !== undefined && {
      parent:
        props.body.parent_id === null
          ? { disconnect: true }
          : { connect: { id: props.body.parent_id } },
    }),
  };
  await MyGlobal.prisma.hrm_platform_departments.update({
    where: { id: props.departmentId },
    data: updateData,
  });
  // Fetch and transform the updated department
  const updated =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      ...HrmPlatformDepartmentTransformer.select(),
    });
  return await HrmPlatformDepartmentTransformer.transform(updated);
}
