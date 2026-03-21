import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmContractTransformer } from "../transformers/ErpHrmContractTransformer";
import { ErpHrmEmployeeAtSummaryTransformer } from "../transformers/ErpHrmEmployeeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmAdminEmployeesEmployeeIdContractsContractId(props: {
  admin: AdminPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
}): Promise<IErpHrmContract> {
  const contract = await MyGlobal.prisma.erp_hrm_contracts.findUniqueOrThrow({
    where: { id: props.contractId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      start_date: true,
      end_date: true,
      pay_rate: true,
      pay_period: true,
      working_hours_per_week: true,
      notes: true,
      employee: ErpHrmEmployeeAtSummaryTransformer.select(),
      created_at: true,
      updated_at: true,
    },
  });
  if (contract.erp_hrm_employee_id !== props.employeeId) {
    throw new HttpException("Contract not found", 404);
  }
  return await ErpHrmContractTransformer.transform(contract);
}
