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

export async function patchHrmPlatformMemberContracts(props: {
  member: MemberPayload;
  body: IHrmPlatformEmployeeContract.IRequest;
}): Promise<IPageIHrmPlatformEmployeeContract.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const memberOrg = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      organization_id: true,
    },
  });
  if (!memberOrg) {
    throw new HttpException("Member not found in any organization", 404);
  }
  const whereInput: Prisma.hrm_platform_employee_contractsWhereInput = {
    deleted_at: null,
    employee: {
      organization_id: memberOrg.organization_id,
      deleted_at: null,
    },
    ...(props.body.hrm_platform_employee_id && {
      hrm_platform_employee_id: props.body.hrm_platform_employee_id,
    }),
    ...(props.body.start_date_gte || props.body.start_date_lte
      ? {
          start_date: {
            ...(props.body.start_date_gte && {
              gte: new Date(props.body.start_date_gte),
            }),
            ...(props.body.start_date_lte && {
              lte: new Date(props.body.start_date_lte),
            }),
          },
        }
      : {}),
    ...(props.body.end_date_gte || props.body.end_date_lte
      ? {
          end_date: {
            ...(props.body.end_date_gte && {
              gte: new Date(props.body.end_date_gte),
            }),
            ...(props.body.end_date_lte && {
              lte: new Date(props.body.end_date_lte),
            }),
          },
        }
      : {}),
    ...(props.body.pay_period && {
      pay_period: props.body.pay_period,
    }),
    ...(props.body.is_active !== undefined && {
      end_date: props.body.is_active ? null : { not: null },
    }),
  } satisfies Prisma.hrm_platform_employee_contractsWhereInput;
  const orderByInput: Prisma.hrm_platform_employee_contractsOrderByWithRelationInput[] =
    props.body.sort
      ? props.body.sort.split(",").reduce((acc, field) => {
          const trimmed = field.trim();
          const desc = trimmed.startsWith("-");
          const fieldName = desc ? trimmed.slice(1) : trimmed;
          return [...acc, { [fieldName]: desc ? "desc" : "asc" }];
        }, [] as Prisma.hrm_platform_employee_contractsOrderByWithRelationInput[])
      : [{ start_date: "desc" }];
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
      },
    },
  });
  const total = await MyGlobal.prisma.hrm_platform_employee_contracts.count({
    where: whereInput,
  });
  return {
    data: data.map((contract) => ({
      id: contract.id,
      start_date: toISOStringSafe(contract.start_date),
      end_date: contract.end_date ? toISOStringSafe(contract.end_date) : null,
      pay_rate: contract.pay_rate,
      pay_period: contract.pay_period,
      working_hours_per_week: contract.working_hours_per_week,
      notes: contract.notes ?? null,
      employee: {
        id: contract.employee.id,
        display_name: contract.employee.display_name,
        position: contract.employee.position ?? null,
        employment_type: contract.employee.employment_type,
        status: contract.employee.status,
        department: contract.employee.department
          ? {
              id: contract.employee.department.id,
              name: contract.employee.department.name,
              description: contract.employee.department.description ?? null,
              parent: contract.employee.department.parent
                ? {
                    id: contract.employee.department.parent.id,
                    name: contract.employee.department.parent.name,
                    description:
                      contract.employee.department.parent.description ?? null,
                    parent: null,
                  }
                : null,
            }
          : null,
        role: {
          id: contract.employee.role.id,
          name: contract.employee.role.name,
          built_in: contract.employee.role.built_in,
          created_at: toISOStringSafe(contract.employee.role.created_at),
        } satisfies IHrmPlatformRole.ISummary,
      } satisfies IHrmPlatformEmployee.ISummary,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmPlatformEmployeeContract.ISummary;
}
