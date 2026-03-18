import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContract";
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
  body: IHrmPlatformContract.IRequest;
}): Promise<IPageIHrmPlatformContract.ISummary> {
  // Verify employee exists
  const employee = await MyGlobal.prisma.hrm_platform_employees.findUnique({
    where: { id: props.employeeId },
    select: {
      id: true,
      hrm_platform_user_id: true,
      hrm_platform_organization_id: true,
      hrm_platform_role_id: true,
      hrm_platform_department_id: true,
      position: true,
      employment_type: true,
      status: true,
      created_at: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  // Check authorization: own employee or employee:view permission
  const isOwnEmployee = employee.hrm_platform_user_id === props.member.id;
  if (!isOwnEmployee) {
    // Get member's employee record in the same organization to check permissions
    const memberEmployee =
      await MyGlobal.prisma.hrm_platform_employees.findFirst({
        where: {
          hrm_platform_user_id: props.member.id,
          hrm_platform_organization_id: employee.hrm_platform_organization_id,
          deleted_at: null,
        },
        select: {
          hrm_platform_role_id: true,
        },
      });
    if (memberEmployee === null) {
      throw new HttpException("Forbidden", 403);
    }
    // Check if member's role has employee:view permission
    const hasPermission =
      await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
        where: {
          hrm_platform_role_id: memberEmployee.hrm_platform_role_id,
          permission: {
            code: "employee:view",
          },
        },
      });
    if (hasPermission === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Build where clause for contracts
  const whereInput: Prisma.hrm_platform_contractsWhereInput = {
    hrm_platform_employee_id: props.employeeId,
    deleted_at: null,
    ...(props.body.start_date_from && {
      start_date: {
        gte: new Date(props.body.start_date_from),
      },
    }),
    ...(props.body.start_date_to && {
      start_date: {
        lte: new Date(props.body.start_date_to),
      },
    }),
    ...(props.body.end_date_from && {
      end_date: {
        gte: new Date(props.body.end_date_from),
      },
    }),
    ...(props.body.end_date_to && {
      end_date: {
        lte: new Date(props.body.end_date_to),
      },
    }),
    ...(props.body.pay_period && {
      pay_period: props.body.pay_period,
    }),
  } satisfies Prisma.hrm_platform_contractsWhereInput;
  // Build order by
  const sortBy = props.body.sortBy ?? "start_date";
  const sortOrder = props.body.sortOrder ?? "desc";
  const validSortFields = [
    "start_date",
    "end_date",
    "pay_rate",
    "pay_period",
    "working_hours_per_week",
    "created_at",
  ];
  if (!validSortFields.includes(sortBy)) {
    throw new HttpException("Invalid sortBy field", 400);
  }
  const orderByInput: Prisma.hrm_platform_contractsOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  } satisfies Prisma.hrm_platform_contractsOrderByWithRelationInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Fetch contracts with nested employee data
  const contracts = await MyGlobal.prisma.hrm_platform_contracts.findMany({
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
      employee: {
        select: {
          id: true,
          position: true,
          employment_type: true,
          status: true,
          hrm_platform_user_id: true,
          hrm_platform_role_id: true,
          hrm_platform_department_id: true,
          created_at: true,
          user: {
            select: {
              id: true,
              email: true,
              display_name: true,
              avatar_image: true,
              phone_number: true,
            },
          },
          role: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              is_builtin: true,
              created_at: true,
              deleted_at: true,
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
          },
          department: {
            select: {
              id: true,
              name: true,
              description: true,
              parent_department_id: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.hrm_platform_contracts.count({
    where: whereInput,
  });
  // Transform to DTO
  const data = await ArrayUtil.asyncMap(contracts, async (contract) => {
    const employeeSummary: IHrmPlatformEmployee.ISummary = {
      id: contract.employee.id,
      position: contract.employee.position,
      employment_type: contract.employee.employment_type,
      status: contract.employee.status,
      user: {
        id: contract.employee.user.id,
        email: contract.employee.user.email,
        display_name: contract.employee.user.display_name,
        avatar_image: contract.employee.user.avatar_image,
        phone_number: contract.employee.user.phone_number,
      } satisfies IHrmPlatformMember.ISummary,
      role: {
        id: contract.employee.role.id,
        code: contract.employee.role.code,
        name: contract.employee.role.name,
        description: contract.employee.role.description,
        is_builtin: contract.employee.role.is_builtin,
        permissions: contract.employee.role.permissions.map(
          (rp: any) => rp.permission.code,
        ),
        created_at: toISOStringSafe(contract.employee.role.created_at),
        deleted_at: contract.employee.role.deleted_at
          ? toISOStringSafe(contract.employee.role.deleted_at)
          : null,
      } satisfies IHrmPlatformRole.ISummary,
      department: contract.employee.department
        ? ({
            id: contract.employee.department.id,
            name: contract.employee.department.name,
            description: contract.employee.department.description,
            parent_department: null,
            created_at: toISOStringSafe(
              contract.employee.department.created_at,
            ),
            updated_at: toISOStringSafe(
              contract.employee.department.updated_at,
            ),
            deleted_at: contract.employee.department.deleted_at
              ? toISOStringSafe(contract.employee.department.deleted_at)
              : null,
          } satisfies IHrmPlatformDepartment.ISummary)
        : null,
      created_at: toISOStringSafe(contract.employee.created_at),
    } satisfies IHrmPlatformEmployee.ISummary;
    return {
      id: contract.id as string & tags.Format<"uuid">,
      start_date: toISOStringSafe(contract.start_date),
      end_date: contract.end_date ? toISOStringSafe(contract.end_date) : null,
      pay_rate: contract.pay_rate,
      pay_period: contract.pay_period,
      working_hours_per_week: contract.working_hours_per_week,
      employee: employeeSummary,
    } satisfies IHrmPlatformContract.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIHrmPlatformContract.ISummary;
}
