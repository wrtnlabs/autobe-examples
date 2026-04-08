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
import { ErpHrmContractCollector } from "../collectors/ErpHrmContractCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmContractAtResponseTransformer } from "../transformers/ErpHrmContractAtResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminEmployeesEmployeeIdContracts(props: {
  admin: AdminPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IErpHrmContract.ICreate;
}): Promise<IErpHrmContract.IResponse> {
  // 1. Verify the employee exists
  await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    select: { id: true },
  });
  // 2. Check for existing active contract that overlaps with new contract
  const newStartDate = new Date(props.body.startDate);
  // Find active contract: end_date is null (ongoing) OR end_date >= new start date
  const existingActiveContract =
    await MyGlobal.prisma.erp_hrm_contracts.findFirst({
      where: {
        erp_hrm_employee_id: props.employeeId,
        end_date: null,
        start_date: { lte: newStartDate },
      },
      select: { id: true, start_date: true },
    });
  // 3. If overlapping active contract exists, automatically end it
  if (existingActiveContract) {
    // Set end_date to one day before the new contract's start_date
    const endDate = new Date(newStartDate);
    endDate.setDate(endDate.getDate() - 1);
    await MyGlobal.prisma.erp_hrm_contracts.update({
      where: { id: existingActiveContract.id },
      data: {
        end_date: endDate,
        updated_at: new Date(),
      },
    });
  }
  // 4. Create the new contract
  const record = await MyGlobal.prisma.erp_hrm_contracts.create({
    data: await ErpHrmContractCollector.collect({
      body: props.body,
      erpHrmEmployees: { id: props.employeeId },
    }),
    ...ErpHrmContractAtResponseTransformer.select(),
  });
  // 5. Return the created contract
  return await ErpHrmContractAtResponseTransformer.transform(record);
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
// export async function postErpHrmAdminEmployeesEmployeeIdContracts(props: {
//   admin: AdminPayload;
//   employeeId: string & tags.Format<"uuid">;
//   body: IErpHrmContract.ICreate;
// }): Promise<IErpHrmContract.IResponse> {
//   const record = await MyGlobal.prisma.erp_hrm_contracts.create({
//     data: await ErpHrmContractCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmContractAtResponseTransformer.select(),
//   });
//   return await ErpHrmContractAtResponseTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------