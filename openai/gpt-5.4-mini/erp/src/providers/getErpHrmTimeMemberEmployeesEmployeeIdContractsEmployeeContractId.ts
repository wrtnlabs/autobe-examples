import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeEmployeeContractTransformer } from "../transformers/ErpHrmTimeEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberEmployeesEmployeeIdContractsEmployeeContractId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  employeeContractId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeEmployeeContract> {
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        id: props.employeeId,
        erp_hrm_time_member_id: props.member.id,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
      },
    });
  const contract =
    await MyGlobal.prisma.erp_hrm_time_employee_contracts.findUniqueOrThrow({
      where: {
        id: props.employeeContractId,
      },
      ...ErpHrmTimeEmployeeContractTransformer.select(),
    });
  if (contract.employee.id !== employee.id) {
    throw new HttpException("Not Found", 404);
  }
  return await ErpHrmTimeEmployeeContractTransformer.transform(contract);
}
