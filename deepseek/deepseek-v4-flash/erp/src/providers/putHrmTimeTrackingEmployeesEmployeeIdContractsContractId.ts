import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingEmployeeContractTransformer } from "../transformers/HrmTimeTrackingEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingEmployeesEmployeeIdContractsContractId(props: {
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingEmployeeContract.IUpdate;
}): Promise<IHrmTimeTrackingEmployeeContract> {
  // Validate the contract exists and belongs to the specified employee
  const contract =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findUniqueOrThrow(
      {
        where: { id: props.contractId },
        select: {
          id: true,
          hrm_time_tracking_employee_id: true,
          start_date: true,
          end_date: true,
        },
      },
    );
  // Contract must belong to the specified employee
  if (contract.hrm_time_tracking_employee_id !== props.employeeId) {
    throw new HttpException(
      "Contract not found for the specified employee",
      404,
    );
  }
  // Only active contracts (end_date IS NULL) can be modified
  if (contract.end_date !== null) {
    throw new HttpException(
      "Past contracts are immutable and cannot be modified",
      422,
    );
  }
  // Validate pay_period value
  if (
    props.body.pay_period !== undefined &&
    !["hourly", "daily", "weekly", "monthly"].includes(props.body.pay_period)
  ) {
    throw new HttpException(
      "pay_period must be one of: hourly, daily, weekly, monthly",
      400,
    );
  }
  // Validate pay_rate > 0
  if (props.body.pay_rate !== undefined && props.body.pay_rate <= 0) {
    throw new HttpException("pay_rate must be greater than 0", 400);
  }
  // Validate working_hours_per_week > 0
  if (
    props.body.working_hours_per_week !== undefined &&
    props.body.working_hours_per_week <= 0
  ) {
    throw new HttpException(
      "working_hours_per_week must be greater than 0",
      400,
    );
  }
  // If end_date is being set, validate it is not before start_date
  // ISO 8601 strings are lexicographically sortable, so direct string comparison works
  if (props.body.end_date !== undefined) {
    if (props.body.end_date < contract.start_date.toISOString()) {
      throw new HttpException("end_date cannot be before start_date", 400);
    }
  }
  // Update allowed mutable fields
  await MyGlobal.prisma.hrm_time_tracking_employee_contracts.update({
    where: { id: props.contractId },
    data: {
      ...(props.body.pay_rate !== undefined && {
        pay_rate: props.body.pay_rate,
      }),
      ...(props.body.pay_period !== undefined && {
        pay_period: props.body.pay_period,
      }),
      ...(props.body.working_hours_per_week !== undefined && {
        working_hours_per_week: props.body.working_hours_per_week,
      }),
      ...(props.body.end_date !== undefined && {
        end_date: props.body.end_date,
      }),
      ...(props.body.notes !== undefined && { notes: props.body.notes }),
      updated_at: new Date().toISOString(),
    },
  });
  // Fetch the updated contract with full detail using the transformer
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findUniqueOrThrow(
      {
        where: { id: props.contractId },
        ...HrmTimeTrackingEmployeeContractTransformer.select(),
      },
    );
  return await HrmTimeTrackingEmployeeContractTransformer.transform(updated);
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
// import { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmTimeTrackingEmployeesEmployeeIdContractsContractId(props: {
//   employeeId: string & tags.Format<"uuid">;
//   contractId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingEmployeeContract.IUpdate;
// }): Promise<IHrmTimeTrackingEmployeeContract> {
//   await MyGlobal.prisma.hrm_time_tracking_employee_contracts.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findUniqueOrThrow({
//     where: { ... },
//     ...HrmTimeTrackingEmployeeContractTransformer.select(),
//   });
//   return await HrmTimeTrackingEmployeeContractTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------