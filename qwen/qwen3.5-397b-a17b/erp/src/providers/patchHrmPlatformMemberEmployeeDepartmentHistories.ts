import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformEmployeeDepartmentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeDepartmentHistory";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformEmployeeDepartmentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeDepartmentHistory";
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

export async function patchHrmPlatformMemberEmployeeDepartmentHistories(props: {
  member: MemberPayload;
  body: IHrmPlatformEmployeeDepartmentHistory.IRequest;
}): Promise<IPageIHrmPlatformEmployeeDepartmentHistory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const changedAtConditions: Prisma.DateTimeFilter = {};
  if (props.body.changed_at_from !== undefined) {
    changedAtConditions.gte = new Date(props.body.changed_at_from);
  }
  if (props.body.changed_at_to !== undefined) {
    changedAtConditions.lte = new Date(props.body.changed_at_to);
  }
  const createdAtConditions: Prisma.DateTimeFilter = {};
  if (props.body.created_at_from !== undefined) {
    createdAtConditions.gte = new Date(props.body.created_at_from);
  }
  if (props.body.created_at_to !== undefined) {
    createdAtConditions.lte = new Date(props.body.created_at_to);
  }
  const whereInput: Prisma.hrm_platform_employee_department_historiesWhereInput =
    {
      ...(props.body.employee_id !== undefined && {
        employee_id: props.body.employee_id,
      }),
      ...(props.body.department_id !== undefined && {
        department_id: props.body.department_id,
      }),
      ...(props.body.changed_by_id !== undefined && {
        changed_by_id: props.body.changed_by_id,
      }),
      ...(Object.keys(changedAtConditions).length > 0 && {
        changed_at: changedAtConditions,
      }),
      ...(Object.keys(createdAtConditions).length > 0 && {
        created_at: createdAtConditions,
      }),
    } satisfies Prisma.hrm_platform_employee_department_historiesWhereInput;
  const sortField = props.body.sort ?? "changed_at_desc";
  const sortParts = sortField.split("_");
  const field = sortParts[0];
  const direction = sortParts[1] === "asc" ? "asc" : "desc";
  const orderByInput: Prisma.hrm_platform_employee_department_historiesOrderByWithRelationInput =
    {
      [field]: direction,
    };
  const data =
    await MyGlobal.prisma.hrm_platform_employee_department_histories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        employee: {
          select: {
            id: true,
            display_name: true,
            position: true,
            employment_type: true,
            status: true,
            department: {
              select: {
                id: true,
                name: true,
                description: true,
                parent: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    parent_id: true,
                  },
                },
              },
            },
            role: {
              select: {
                id: true,
                name: true,
                built_in: true,
                created_at: true,
              },
            },
          },
        } satisfies Prisma.hrm_platform_employeesFindManyArgs,
        department: {
          select: {
            id: true,
            name: true,
            description: true,
            parent: {
              select: {
                id: true,
                name: true,
                description: true,
                parent_id: true,
              },
            },
          },
        } satisfies Prisma.hrm_platform_departmentsFindManyArgs,
        changedBy: {
          select: {
            id: true,
            email: true,
            display_name: true,
            avatar_url: true,
            phone_number: true,
            created_at: true,
          },
        } satisfies Prisma.hrm_platform_membersFindManyArgs,
        changed_at: true,
        created_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.hrm_platform_employee_department_histories.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(data, async (record) => {
      const employeeDepartmentParent = record.employee.department?.parent;
      const employeeDepartment: IHrmPlatformDepartment.ISummary | null = record
        .employee.department
        ? {
            id: record.employee.department.id,
            name: record.employee.department.name,
            description: record.employee.department.description,
            parent: employeeDepartmentParent
              ? {
                  id: employeeDepartmentParent.id,
                  name: employeeDepartmentParent.name,
                  description: employeeDepartmentParent.description,
                  parent: null,
                }
              : null,
          }
        : null;
      const departmentParent = record.department?.parent;
      const department: IHrmPlatformDepartment.ISummary | null =
        record.department
          ? {
              id: record.department.id,
              name: record.department.name,
              description: record.department.description,
              parent: departmentParent
                ? {
                    id: departmentParent.id,
                    name: departmentParent.name,
                    description: departmentParent.description,
                    parent: null,
                  }
                : null,
            }
          : null;
      return {
        id: record.id,
        employee: {
          id: record.employee.id,
          display_name: record.employee.display_name,
          position: record.employee.position,
          employment_type: record.employee.employment_type,
          status: record.employee.status,
          department: employeeDepartment,
          role: {
            id: record.employee.role.id,
            name: record.employee.role.name,
            built_in: record.employee.role.built_in,
            created_at: toISOStringSafe(record.employee.role.created_at),
          } satisfies IHrmPlatformRole.ISummary,
        } satisfies IHrmPlatformEmployee.ISummary,
        department: department,
        changedBy: {
          id: record.changedBy.id,
          email: record.changedBy.email,
          display_name: record.changedBy.display_name,
          avatar_url: record.changedBy.avatar_url,
          phone_number: record.changedBy.phone_number,
          created_at: toISOStringSafe(record.changedBy.created_at),
        } satisfies IHrmPlatformMember.ISummary,
        changed_at: toISOStringSafe(record.changed_at),
        created_at: toISOStringSafe(record.created_at),
      } satisfies IHrmPlatformEmployeeDepartmentHistory.ISummary;
    }),
  };
}
