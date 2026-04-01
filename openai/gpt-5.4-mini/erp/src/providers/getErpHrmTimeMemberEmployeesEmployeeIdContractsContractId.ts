import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
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

export async function getErpHrmTimeMemberEmployeesEmployeeIdContractsContractId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeEmployeeContract> {
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        id: props.employeeId,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_member_id: true,
        erp_hrm_time_organization_id: true,
      },
    });
  if (employee.erp_hrm_time_member_id !== props.member.id) {
    const membership =
      await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
        where: {
          erp_hrm_time_organization_id: employee.erp_hrm_time_organization_id,
          erp_hrm_time_member_id: props.member.id,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (membership === null) throw new HttpException("Forbidden", 403);
  }
  const contract =
    await MyGlobal.prisma.erp_hrm_time_employee_contracts.findFirstOrThrow({
      where: {
        id: props.contractId,
        erp_hrm_time_employee_id: props.employeeId,
      },
      ...ErpHrmTimeEmployeeContractTransformer.select(),
    });
  return await ErpHrmTimeEmployeeContractTransformer.transform(contract);
}
