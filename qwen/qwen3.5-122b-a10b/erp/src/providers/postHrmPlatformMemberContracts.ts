import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformContractTransformer } from "../transformers/HrmPlatformContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberContracts(props: {
  member: MemberPayload;
  body: IHrmPlatformContract.ICreate;
}): Promise<IHrmPlatformContract> {
  // Verify employee exists and get organization context
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.body.employee_id },
      select: {
        id: true,
        hrm_platform_organization_id: true,
      },
    });
  // Check if member has employee:manage permission in the employee's organization
  // Query through employeeAssignments junction table
  const memberRole = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      hrm_platform_organization_id: employee.hrm_platform_organization_id,
      employeeAssignments: {
        some: {
          hrm_platform_user_id: props.member.id,
        },
      },
    },
    select: {
      id: true,
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
  const hasManagePermission = memberRole?.permissions.some(
    (rp: {
      permission: {
        code: string;
      };
    }) => rp.permission.code === "employee:manage",
  );
  if (!hasManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate start_date is in the past or today
  const newStartDate = new Date(props.body.start_date);
  const now = new Date();
  if (newStartDate > now) {
    throw new HttpException(
      "Contract start date must be in the past or today",
      400,
    );
  }
  // Check for existing active contract
  const existingActiveContract =
    await MyGlobal.prisma.hrm_platform_contracts.findFirst({
      where: {
        hrm_platform_employee_id: props.body.employee_id,
        end_date: null,
      },
    });
  // Execute all database operations in a transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Terminate existing active contract if exists
    if (existingActiveContract) {
      const endDate = new Date(newStartDate);
      endDate.setDate(endDate.getDate() - 1);
      await tx.hrm_platform_contracts.update({
        where: { id: existingActiveContract.id },
        data: {
          end_date: endDate,
          updated_at: new Date(),
        },
      });
    }
    // Create new contract with snapshot
    const created = await tx.hrm_platform_contracts.create({
      data: {
        id: v4(),
        start_date: newStartDate,
        end_date: null,
        pay_rate: props.body.pay_rate,
        pay_period: props.body.pay_period,
        working_hours_per_week: props.body.working_hours_per_week,
        notes: props.body.notes ?? null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        employee: { connect: { id: props.body.employee_id } },
        snapshots: {
          create: {
            id: v4(),
            start_date: newStartDate,
            end_date: null,
            pay_rate: props.body.pay_rate,
            pay_period: props.body.pay_period,
            working_hours_per_week: props.body.working_hours_per_week,
            notes: props.body.notes ?? null,
            created_at: new Date(),
          },
        },
      },
      ...HrmPlatformContractTransformer.select(),
    });
    // Create activity log entry
    await tx.hrm_platform_activity_logs.create({
      data: {
        id: v4(),
        user: { connect: { id: props.member.id } },
        organization: {
          connect: { id: employee.hrm_platform_organization_id },
        },
        action_type: "contract.created",
        target_entity: "contract",
        target_id: created.id,
        details: JSON.stringify({
          employee_id: props.body.employee_id,
          start_date: props.body.start_date,
          pay_rate: props.body.pay_rate,
        }),
        created_at: new Date(),
      },
    });
    return created;
  });
  return await HrmPlatformContractTransformer.transform(result);
}
