import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeContract";
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

export async function patchHrmPlatformMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmPlatformEmployeeContract.IRequest;
}): Promise<IPageIHrmPlatformEmployeeContract.ISummary> {
  const employee = await MyGlobal.prisma.hrm_platform_employees.findUnique({
    where: { id: props.employeeId },
    select: {
      id: true,
      member_id: true,
      organization_id: true,
      role_id: true,
      display_name: true,
      position: true,
      employment_type: true,
      status: true,
      department_id: true,
      department: {
        select: {
          id: true,
          name: true,
          description: true,
          parent_id: true,
          parent: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          } satisfies Prisma.hrm_platform_departmentsFindManyArgs,
        },
      } satisfies Prisma.hrm_platform_departmentsFindManyArgs,
      role: {
        select: {
          id: true,
          name: true,
          built_in: true,
          created_at: true,
          permissions: {
            select: {
              permission: true,
            },
          } satisfies Prisma.hrm_platform_role_permissionsFindManyArgs,
        },
      } satisfies Prisma.hrm_platform_rolesFindManyArgs,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  const isOwner = employee.member_id === props.member.id;
  if (!isOwner) {
    const hasViewPermission = employee.role.permissions.some(
      (p) => p.permission === "employee:view",
    );
    if (!hasViewPermission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_employee_contractsWhereInput = {
    hrm_platform_employee_id: props.employeeId,
    deleted_at: null,
    ...(props.body.start_date_gte && {
      start_date: { gte: new Date(props.body.start_date_gte) },
    }),
    ...(props.body.start_date_lte && {
      start_date: { lte: new Date(props.body.start_date_lte) },
    }),
    ...(props.body.end_date_gte && {
      end_date: { gte: new Date(props.body.end_date_gte) },
    }),
    ...(props.body.end_date_lte && {
      end_date: { lte: new Date(props.body.end_date_lte) },
    }),
    ...(props.body.pay_period && {
      pay_period: props.body.pay_period,
    }),
    ...(props.body.is_active !== undefined && {
      end_date: props.body.is_active ? null : { not: null },
    }),
  } satisfies Prisma.hrm_platform_employee_contractsWhereInput;
  const orderByInput: Prisma.hrm_platform_employee_contractsOrderByWithRelationInput =
    props.body.sort
      ? props.body.sort.split(",").reduce((acc, field) => {
          const trimmed = field.trim();
          const desc = trimmed.startsWith("-");
          const fieldName = desc ? trimmed.slice(1) : trimmed;
          const validFields = [
            "start_date",
            "end_date",
            "pay_rate",
            "pay_period",
            "created_at",
          ];
          if (validFields.includes(fieldName)) {
            acc[
              fieldName as keyof Prisma.hrm_platform_employee_contractsOrderByWithRelationInput
            ] = desc ? "desc" : "asc";
          }
          return acc;
        }, {} as Prisma.hrm_platform_employee_contractsOrderByWithRelationInput)
      : { start_date: "desc" };
  const data = await MyGlobal.prisma.hrm_platform_employee_contracts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      start_date: true,
      end_date: true,
      pay_rate: true,
      pay_period: true,
      working_hours_per_week: true,
      notes: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.hrm_platform_employee_contracts.count({
    where: whereInput,
  });
  const transformedData: IHrmPlatformEmployeeContract.ISummary[] = data.map(
    (contract) => {
      const result: IHrmPlatformEmployeeContract.ISummary = {
        id: contract.id,
        start_date: toISOStringSafe(contract.start_date),
        end_date:
          contract.end_date !== null
            ? toISOStringSafe(contract.end_date)
            : null,
        pay_rate: contract.pay_rate,
        pay_period: contract.pay_period,
        working_hours_per_week: contract.working_hours_per_week,
        notes: contract.notes,
        employee: {
          id: employee.id,
          display_name: employee.display_name,
          position: employee.position,
          employment_type: employee.employment_type,
          status: employee.status,
          department: employee.department
            ? ({
                id: employee.department.id,
                name: employee.department.name,
                description: employee.department.description,
                parent: employee.department.parent
                  ? ({
                      id: employee.department.parent.id,
                      name: employee.department.parent.name,
                      description: employee.department.parent.description,
                      parent: null,
                    } satisfies IHrmPlatformDepartment.ISummary)
                  : null,
              } satisfies IHrmPlatformDepartment.ISummary)
            : null,
          role: {
            id: employee.role.id,
            name: employee.role.name,
            built_in: employee.role.built_in,
            created_at: toISOStringSafe(employee.role.created_at),
          } satisfies IHrmPlatformRole.ISummary,
        } satisfies IHrmPlatformEmployee.ISummary,
      };
      return result;
    },
  );
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  const response: IPageIHrmPlatformEmployeeContract.ISummary = {
    pagination: pagination,
    data: transformedData,
  };
  return response;
}
