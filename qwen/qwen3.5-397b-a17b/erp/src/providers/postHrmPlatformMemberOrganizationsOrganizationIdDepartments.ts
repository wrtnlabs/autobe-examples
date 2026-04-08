import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformDepartmentCollector } from "../collectors/HrmPlatformDepartmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentTransformer } from "../transformers/HrmPlatformDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberOrganizationsOrganizationIdDepartments(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmPlatformDepartment.ICreate;
}): Promise<IHrmPlatformDepartment> {
  // Validate organization exists and is active
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUnique({
      where: { id: props.organizationId, deleted_at: null },
    });
  if (!organization) {
    throw new HttpException("Organization not found", 404);
  }
  // Verify user has org:manage permission in this organization
  const membership =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findFirst({
      where: {
        hrm_platform_member_id: props.member.id,
        hrm_platform_organization_id: props.organizationId,
        deleted_at: null,
      },
      include: {
        member: {
          include: {
            employees: {
              where: {
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
            },
          },
        },
      },
    });
  if (!membership) {
    throw new HttpException("Access denied to organization", 404);
  }
  // Check for org:manage permission
  const employee = membership.member.employees[0];
  if (!employee || !employee.role) {
    throw new HttpException("Permission denied", 403);
  }
  const hasOrgManage = employee.role.rolePermissions.some(
    (rp: any) => rp.permission.code === "org:manage",
  );
  if (!hasOrgManage) {
    throw new HttpException("Permission denied: org:manage required", 403);
  }
  // Check unique constraint: department name must be unique within organization
  const existingDepartment =
    await MyGlobal.prisma.hrm_platform_departments.findFirst({
      where: {
        hrm_platform_organization_id: props.organizationId,
        name: props.body.name,
        deleted_at: null,
      },
    });
  if (existingDepartment) {
    throw new HttpException(
      "Department name already exists in organization",
      409,
    );
  }
  // Validate parent department if provided
  if (
    props.body.parentDepartmentId !== undefined &&
    props.body.parentDepartmentId !== null
  ) {
    const parentDepartment =
      await MyGlobal.prisma.hrm_platform_departments.findUnique({
        where: { id: props.body.parentDepartmentId, deleted_at: null },
      });
    if (!parentDepartment) {
      throw new HttpException("Parent department not found", 400);
    }
    if (
      parentDepartment.hrm_platform_organization_id !== props.organizationId
    ) {
      throw new HttpException(
        "Parent department must belong to same organization",
        400,
      );
    }
  }
  // Create department using collector
  const record = await MyGlobal.prisma.hrm_platform_departments.create({
    data: await HrmPlatformDepartmentCollector.collect({
      body: props.body,
      hrmPlatformOrganizations: { id: props.organizationId },
    }),
    ...HrmPlatformDepartmentTransformer.select(),
  });
  return await HrmPlatformDepartmentTransformer.transform(record);
}
