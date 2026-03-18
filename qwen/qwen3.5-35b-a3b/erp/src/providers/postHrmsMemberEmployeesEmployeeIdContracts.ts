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
import { HrmsEmployeeContractCollector } from "../collectors/HrmsEmployeeContractCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsEmployeeContractTransformer } from "../transformers/HrmsEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmsEmployeeContract.ICreate;
}): Promise<IHrmsEmployeeContract> {
  const employee = await MyGlobal.prisma.hrms_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    select: { id: true, organization_member_id: true },
  });
  if (employee.organization_member_id === null) {
    throw new HttpException("Employee has no organization member record", 404);
  }
  const employeeMember =
    await MyGlobal.prisma.hrms_organization_members.findUniqueOrThrow({
      where: { id: employee.organization_member_id },
      select: {
        id: true,
        hrms_organization_id: true,
        hrms_organization_role_id: true,
      },
    });
  const rolePermission =
    await MyGlobal.prisma.hrms_organization_role_permissions.findFirst({
      where: {
        hrms_organization_role_id: employeeMember.hrms_organization_role_id,
        permission: "manage_employees",
      },
    });
  if (!rolePermission) {
    throw new HttpException("Permission denied", 403);
  }
  const existingActiveContract =
    await MyGlobal.prisma.hrms_employee_contracts.findFirst({
      where: {
        hrms_employee_id: props.employeeId,
        end_date: null,
        deleted_at: null,
      },
    });
  if (existingActiveContract) {
    const newStartDate = new Date(props.body.start_date);
    const previousEndDate = new Date(newStartDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    await MyGlobal.prisma.hrms_employee_contracts.update({
      where: { id: existingActiveContract.id },
      data: {
        end_date: previousEndDate,
        updated_at: new Date(),
      },
    });
  }
  const employeeContract = await MyGlobal.prisma.hrms_employee_contracts.create(
    {
      data: await HrmsEmployeeContractCollector.collect({
        body: props.body,
        hrmsEmployees: {
          id: props.employeeId,
        } satisfies IEntity,
      }),
      ...HrmsEmployeeContractTransformer.select(),
    },
  );
  return await HrmsEmployeeContractTransformer.transform(employeeContract);
}
