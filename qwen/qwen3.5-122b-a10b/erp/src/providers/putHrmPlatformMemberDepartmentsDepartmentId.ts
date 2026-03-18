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
  // 1. Validate department exists and is not soft-deleted
  const department =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      select: {
        id: true,
        hrm_platform_organization_id: true,
        parent_department_id: true,
        deleted_at: true,
      } satisfies Prisma.hrm_platform_departmentsSelect,
    });
  // 2. Verify user has org:manage permission for the organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      hrm_platform_organization_id: department.hrm_platform_organization_id,
      deleted_at: null,
    },
    select: {
      hrm_platform_role_id: true,
    } satisfies Prisma.hrm_platform_employeesSelect,
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: employee.hrm_platform_role_id },
    include: {
      permissions: {
        select: {
          permission: {
            select: {
              code: true,
            },
          },
        },
      },
    },
  });
  const hasOrgManagePermission = role?.permissions.some(
    (rp) => rp.permission.code === "org:manage",
  );
  if (!hasOrgManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check name uniqueness within organization if name is being updated
  if (props.body.name !== undefined) {
    const existing = await MyGlobal.prisma.hrm_platform_departments.findFirst({
      where: {
        hrm_platform_organization_id: department.hrm_platform_organization_id,
        name: props.body.name,
        id: { not: props.departmentId },
        deleted_at: null,
      } satisfies Prisma.hrm_platform_departmentsWhereInput,
    });
    if (existing) {
      throw new HttpException(
        "Department name must be unique within organization",
        400,
      );
    }
  }
  // 4. Validate parent_department_id if provided
  if (props.body.parent_department_id !== undefined) {
    if (props.body.parent_department_id === null) {
      // Setting parent to null is allowed (top-level department)
    } else {
      // Validate parent exists in same organization
      const parent = await MyGlobal.prisma.hrm_platform_departments.findFirst({
        where: {
          id: props.body.parent_department_id,
          hrm_platform_organization_id: department.hrm_platform_organization_id,
          deleted_at: null,
        } satisfies Prisma.hrm_platform_departmentsWhereInput,
      });
      if (!parent) {
        throw new HttpException(
          "Parent department must exist in the same organization",
          400,
        );
      }
      // Prevent circular references - check if department is already ancestor of proposed parent
      const ancestors = await getAncestors(props.body.parent_department_id);
      if (ancestors.includes(department.id)) {
        throw new HttpException(
          "Cannot create circular reference in department hierarchy",
          400,
        );
      }
    }
  }
  // 5. Update department
  await MyGlobal.prisma.hrm_platform_departments.update({
    where: { id: props.departmentId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.parent_department_id !== undefined && {
        parent_department_id: props.body.parent_department_id,
      }),
      updated_at: new Date(),
    },
  });
  // 6. Return updated department
  const updated =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      ...HrmPlatformDepartmentTransformer.select(),
    });
  return await HrmPlatformDepartmentTransformer.transform(updated);
}
async function getAncestors(departmentId: string): Promise<string[]> {
  const ancestors: string[] = [];
  let currentId: string | null = departmentId;
  while (currentId) {
    const dept: {
      parent_department_id: string | null;
    } | null = await MyGlobal.prisma.hrm_platform_departments.findUnique({
      where: { id: currentId },
      select: {
        parent_department_id: true,
      } satisfies Prisma.hrm_platform_departmentsSelect,
    });
    if (!dept?.parent_department_id) {
      break;
    }
    ancestors.push(dept.parent_department_id);
    currentId = dept.parent_department_id;
  }
  return ancestors;
}
