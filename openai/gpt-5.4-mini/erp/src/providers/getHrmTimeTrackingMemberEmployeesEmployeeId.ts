import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
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

export async function getHrmTimeTrackingMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingEmployee> {
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
      where: {
        id: props.employeeId,
      },
      select: {
        id: true,
        organization_id: true,
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
            logo_image_url: true,
            currency: true,
            timezone: true,
            fiscal_start_month: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        userAccount: {
          select: {},
        },
        role: {
          select: {
            id: true,
            organization: {
              select: {
                id: true,
                name: true,
                description: true,
                logo_image_url: true,
                currency: true,
                timezone: true,
                fiscal_start_month: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            name: true,
            code: true,
            description: true,
            is_builtin: true,
            sort_order: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            description: true,
            parent_department_id: true,
            created_at: true,
            updated_at: true,
          },
        },
        position_title: true,
        employment_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (
    (
      props.member as {
        organization_id?: string | null;
      }
    ).organization_id !== employee.organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: employee.id,
    organization: {
      id: employee.organization.id,
      name: employee.organization.name,
      description: employee.organization.description,
      logoImageUrl: employee.organization.logo_image_url,
      currency: employee.organization.currency,
      timezone: employee.organization.timezone,
      fiscalStartMonth: employee.organization.fiscal_start_month,
      createdAt: toISOStringSafe(employee.organization.created_at),
      updatedAt: toISOStringSafe(employee.organization.updated_at),
      deletedAt: employee.organization.deleted_at
        ? toISOStringSafe(employee.organization.deleted_at)
        : null,
    },
    userAccount: {},
    role: {
      id: employee.role.id,
      organization: {
        id: employee.role.organization.id,
        name: employee.role.organization.name,
        description: employee.role.organization.description,
        logoImageUrl: employee.role.organization.logo_image_url,
        currency: employee.role.organization.currency,
        timezone: employee.role.organization.timezone,
        fiscalStartMonth: employee.role.organization.fiscal_start_month,
        createdAt: toISOStringSafe(employee.role.organization.created_at),
        updatedAt: toISOStringSafe(employee.role.organization.updated_at),
        deletedAt: employee.role.organization.deleted_at
          ? toISOStringSafe(employee.role.organization.deleted_at)
          : null,
      },
      name: employee.role.name,
      code: employee.role.code,
      description: employee.role.description,
      isBuiltin: employee.role.is_builtin,
      sortOrder: employee.role.sort_order,
      createdAt: toISOStringSafe(employee.role.created_at),
      updatedAt: toISOStringSafe(employee.role.updated_at),
      deletedAt: employee.role.deleted_at
        ? toISOStringSafe(employee.role.deleted_at)
        : null,
    },
    department:
      employee.department === null
        ? null
        : {
            id: employee.department.id,
            name: employee.department.name,
            description: employee.department.description,
            parentDepartmentId: employee.department.parent_department_id,
            created_at: toISOStringSafe(employee.department.created_at),
            updated_at: toISOStringSafe(employee.department.updated_at),
          },
    positionTitle: employee.position_title,
    employmentType: employee.employment_type,
    status: employee.status,
    createdAt: toISOStringSafe(employee.created_at),
    updatedAt: toISOStringSafe(employee.updated_at),
    deletedAt: employee.deleted_at
      ? toISOStringSafe(employee.deleted_at)
      : null,
  };
}
