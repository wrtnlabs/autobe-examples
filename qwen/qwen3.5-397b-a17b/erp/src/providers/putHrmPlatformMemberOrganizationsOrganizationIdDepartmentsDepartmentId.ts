import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
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

export async function putHrmPlatformMemberOrganizationsOrganizationIdDepartmentsDepartmentId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  departmentId: string & tags.Format<"uuid">;
  body: IHrmPlatformDepartment.IUpdate;
}): Promise<IHrmPlatformDepartment> {
  // Verify member has org:manage permission in the organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      organization_id: props.organizationId,
      deleted_at: null,
    },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });
  if (!employee || !employee.role) {
    throw new HttpException("Forbidden", 403);
  }
  const hasOrgManagePermission = employee.role.rolePermissions.some(
    (rp: {
      permission: {
        code: string;
      };
    }) => rp.permission.code === "org:manage",
  );
  if (!hasOrgManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate department exists, belongs to organization, and is not soft-deleted
  const department = await MyGlobal.prisma.hrm_platform_departments.findUnique({
    where: { id: props.departmentId },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      deleted_at: true,
    },
  });
  if (!department) {
    throw new HttpException("Not Found", 404);
  }
  if (department.hrm_platform_organization_id !== props.organizationId) {
    throw new HttpException("Forbidden", 403);
  }
  if (department.deleted_at !== null) {
    throw new HttpException("Bad Request", 400);
  }
  // Check name uniqueness within organization (excluding current department)
  if (props.body.name !== undefined) {
    const existingDepartment =
      await MyGlobal.prisma.hrm_platform_departments.findFirst({
        where: {
          hrm_platform_organization_id: props.organizationId,
          name: props.body.name,
          id: { not: props.departmentId },
          deleted_at: null,
        },
      });
    if (existingDepartment) {
      throw new HttpException("Conflict", 409);
    }
  }
  // Validate parent department if provided
  if (props.body.parentDepartmentId !== undefined) {
    if (props.body.parentDepartmentId !== null) {
      const parentDepartment =
        await MyGlobal.prisma.hrm_platform_departments.findUnique({
          where: { id: props.body.parentDepartmentId },
          select: {
            id: true,
            hrm_platform_organization_id: true,
            deleted_at: true,
          },
        });
      if (!parentDepartment) {
        throw new HttpException("Bad Request", 400);
      }
      if (
        parentDepartment.hrm_platform_organization_id !== props.organizationId
      ) {
        throw new HttpException("Bad Request", 400);
      }
      if (parentDepartment.deleted_at !== null) {
        throw new HttpException("Bad Request", 400);
      }
    }
  }
  // Update the department
  await MyGlobal.prisma.hrm_platform_departments.update({
    where: { id: props.departmentId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.parentDepartmentId !== undefined && {
        parent_department_id: props.body.parentDepartmentId,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch and return updated department
  const updated =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      ...HrmPlatformDepartmentTransformer.select(),
    });
  return await HrmPlatformDepartmentTransformer.transform(updated);
}
