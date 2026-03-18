import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
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
import { HrmTimeTrackingEmployeeContractTransformer } from "../transformers/HrmTimeTrackingEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingMemberEmployeesEmployeeIdContractsContractId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingEmployeeContract> {
  const member =
    await MyGlobal.prisma.hrm_time_tracking_members.findFirstOrThrow({
      where: {
        id: props.member.id,
      },
      select: {
        id: true,
      },
    });
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        id: props.employeeId,
      },
      select: {
        id: true,
        organization_id: true,
        user_account_id: true,
      },
    });
  const ownEmployee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
      where: {
        user_account_id: props.member.id,
        organization_id: employee.organization_id,
      },
      select: {
        id: true,
      },
    });
  if (ownEmployee === null && props.member.id !== member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const contract =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findFirstOrThrow(
      {
        where: {
          id: props.contractId,
          hrm_time_tracking_employee_id: props.employeeId,
        },
        ...HrmTimeTrackingEmployeeContractTransformer.select(),
      },
    );
  if (contract.employee.id !== props.employeeId) {
    throw new HttpException("Not Found", 404);
  }
  if (contract.employee.organization.id !== employee.organization_id) {
    throw new HttpException("Not Found", 404);
  }
  return await HrmTimeTrackingEmployeeContractTransformer.transform(contract);
}
