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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmAdminEmployeesEmployeeIdContractsContractId(props: {
  admin: AdminPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
  body: IErpHrmContract.IUpdate;
}): Promise<IErpHrmContract> {
  // Step 1: Verify employee exists
  await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    select: { id: true },
  });
  // Step 2: Retrieve contract
  const contract = await MyGlobal.prisma.erp_hrm_contracts.findUniqueOrThrow({
    where: { id: props.contractId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      end_date: true,
    },
  });
  // Step 3: Verify contract belongs to specified employee
  if (contract.erp_hrm_employee_id !== props.employeeId) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Validate contract is active (end_date null or in future)
  if (contract.end_date !== null && contract.end_date.getTime() <= Date.now()) {
    throw new HttpException("Cannot modify historical contract", 400);
  }
  // Step 5: Build update data from provided fields
  const data: {
    end_date?: string | null;
    notes?: string | null;
    pay_period?: string;
    pay_rate?: number;
    working_hours_per_week?: number;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.endDate !== undefined) {
    data.end_date = props.body.endDate;
  }
  if (props.body.notes !== undefined) {
    data.notes = props.body.notes;
  }
  if (props.body.payPeriod !== undefined) {
    data.pay_period = props.body.payPeriod;
  }
  if (props.body.payRate !== undefined) {
    data.pay_rate = props.body.payRate;
  }
  if (props.body.workingHoursPerWeek !== undefined) {
    data.working_hours_per_week = props.body.workingHoursPerWeek;
  }
  // Step 6: Execute update
  await MyGlobal.prisma.erp_hrm_contracts.update({
    where: { id: props.contractId },
    data: data,
  });
  // Step 7: Retrieve updated contract and transform response
  const updated = await MyGlobal.prisma.erp_hrm_contracts.findUniqueOrThrow({
    where: { id: props.contractId },
    ...ErpHrmContractTransformer.select(),
  });
  return await ErpHrmContractTransformer.transform(updated);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putErpHrmAdminEmployeesEmployeeIdContractsContractId(props: {
//   admin: AdminPayload;
//   employeeId: string & tags.Format<"uuid">;
//   contractId: string & tags.Format<"uuid">;
//   body: IErpHrmContract.IUpdate;
// }): Promise<IErpHrmContract> {
//   await MyGlobal.prisma.erp_hrm_contracts.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.erp_hrm_contracts.findUniqueOrThrow({
//     where: { ... },
//     ...ErpHrmContractTransformer.select(),
//   });
//   return await ErpHrmContractTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------