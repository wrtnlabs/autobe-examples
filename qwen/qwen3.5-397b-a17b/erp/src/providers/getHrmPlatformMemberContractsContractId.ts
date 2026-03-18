import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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

export async function getHrmPlatformMemberContractsContractId(props: {
  member: MemberPayload;
  contractId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformEmployeeContract> {
  const contract =
    await MyGlobal.prisma.hrm_platform_employee_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
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
        deleted_at: true,
        hrm_platform_employee_id: true,
      },
    });
  if (contract.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: contract.hrm_platform_employee_id },
      select: {
        id: true,
        display_name: true,
        position: true,
        employment_type: true,
        status: true,
        member_id: true,
        organization_id: true,
        role_id: true,
        department_id: true,
      },
    });
  const isOwner = employee.member_id === props.member.id;
  if (!isOwner) {
    const hasViewPermission =
      await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
        where: {
          role_id: employee.role_id,
          permission: "employee:view",
          deleted_at: null,
        },
      });
    if (!hasViewPermission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const department = employee.department_id
    ? await MyGlobal.prisma.hrm_platform_departments.findUnique({
        where: { id: employee.department_id },
        select: { id: true, name: true, description: true, parent_id: true },
      })
    : null;
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: employee.role_id },
    select: { id: true, name: true, built_in: true, created_at: true },
  });
  const parentDepartment = department?.parent_id
    ? await MyGlobal.prisma.hrm_platform_departments.findUnique({
        where: { id: department.parent_id },
        select: { id: true, name: true, description: true, parent_id: true },
      })
    : null;
  return {
    id: contract.id,
    employee: {
      id: employee.id,
      display_name: employee.display_name,
      position: employee.position ?? null,
      employment_type: employee.employment_type,
      status: employee.status,
      department: department
        ? {
            id: department.id,
            name: department.name,
            description: department.description ?? null,
            parent: parentDepartment
              ? {
                  id: parentDepartment.id,
                  name: parentDepartment.name,
                  description: parentDepartment.description ?? null,
                  parent: parentDepartment.parent_id
                    ? {
                        id: parentDepartment.parent_id,
                        name: "",
                        description: null,
                        parent: null,
                      }
                    : null,
                }
              : null,
          }
        : null,
      role: {
        id: role.id,
        name: role.name,
        built_in: role.built_in,
        created_at: toISOStringSafe(role.created_at),
      },
    },
    start_date: toISOStringSafe(contract.start_date),
    end_date: contract.end_date ? toISOStringSafe(contract.end_date) : null,
    pay_rate: contract.pay_rate,
    pay_period: contract.pay_period,
    working_hours_per_week: contract.working_hours_per_week,
    notes: contract.notes ?? null,
    created_at: toISOStringSafe(contract.created_at),
    updated_at: toISOStringSafe(contract.updated_at),
  } satisfies IHrmPlatformEmployeeContract;
}
