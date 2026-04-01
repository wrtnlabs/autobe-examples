import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployeeContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsEmployeeContractTransformer } from "../transformers/HrmsEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmsEmployeeContract.ICreate;
}): Promise<IHrmsEmployeeContract> {
  // Verify employee exists
  const employee = await MyGlobal.prisma.hrms_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    select: { id: true, organization_member_id: true },
  });
  // Verify user has employee management permission
  const orgMember =
    await MyGlobal.prisma.hrms_organization_members.findFirstOrThrow({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
        hrms_organization_role_id: employee.organization_member_id,
      },
      include: {
        organizationRole: {
          include: {
            permissions: true,
          },
        },
      },
    });
  const hasPermission = orgMember.organizationRole.permissions.some(
    (p: any) => p.manage_employees === true,
  );
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Check for existing active contract
  const existingActiveContract =
    await MyGlobal.prisma.hrms_employee_contracts.findFirst({
      where: {
        hrms_employee_id: props.employeeId,
        end_date: null,
      },
    });
  // If active contract exists, update its end_date to day before new start_date
  if (existingActiveContract) {
    const newStartDate = new Date(props.body.start_date);
    const previousEndDate = new Date(
      newStartDate.getTime() - 24 * 60 * 60 * 1000,
    );
    await MyGlobal.prisma.hrms_employee_contracts.update({
      where: { id: existingActiveContract.id },
      data: {
        end_date: previousEndDate,
        updated_at: new Date(),
      },
    });
  }
  // Create new contract
  const created = await MyGlobal.prisma.hrms_employee_contracts.create({
    data: {
      id: v4(),
      hrms_employee_id: props.employeeId,
      start_date: new Date(props.body.start_date),
      end_date: null,
      pay_rate: props.body.pay_rate,
      pay_period: props.body.pay_period,
      working_hours_per_week: props.body.working_hours_per_week,
      notes: props.body.notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...HrmsEmployeeContractTransformer.select(),
  });
  return await HrmsEmployeeContractTransformer.transform(created);
}
