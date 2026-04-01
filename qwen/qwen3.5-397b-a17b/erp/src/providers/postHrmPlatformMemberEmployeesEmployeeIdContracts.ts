import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformEmployeeContractCollector } from "../collectors/HrmPlatformEmployeeContractCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeContractTransformer } from "../transformers/HrmPlatformEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmPlatformEmployeeContract.ICreate;
}): Promise<IHrmPlatformEmployeeContract> {
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: { id: true, deleted_at: true },
    });
  if (employee.deleted_at !== null) {
    throw new HttpException("Employee is deactivated", 400);
  }
  const startDate = new Date(props.body.start_date);
  const now = new Date();
  if (startDate < now) {
    throw new HttpException("Start date cannot be in the past", 400);
  }
  const activeContract =
    await MyGlobal.prisma.hrm_platform_employee_contracts.findFirst({
      where: {
        hrm_platform_employee_id: props.employeeId,
        end_date: null,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (activeContract !== null) {
    const endDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    await MyGlobal.prisma.hrm_platform_employee_contracts.update({
      where: { id: activeContract.id },
      data: {
        end_date: endDate,
        updated_at: new Date(),
      },
    });
  }
  const created = await MyGlobal.prisma.hrm_platform_employee_contracts.create({
    data: await HrmPlatformEmployeeContractCollector.collect({
      body: props.body,
      hrmPlatformEmployees: { id: props.employeeId },
    }),
    ...HrmPlatformEmployeeContractTransformer.select(),
  });
  return await HrmPlatformEmployeeContractTransformer.transform(created);
}
