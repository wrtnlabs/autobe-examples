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
import { HrmTimeTrackingEmployeeContractCollector } from "../collectors/HrmTimeTrackingEmployeeContractCollector";
import { HrmTimeTrackingEmployeeContractTransformer } from "../transformers/HrmTimeTrackingEmployeeContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingEmployeesEmployeeIdContracts(props: {
  employeeId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingEmployeeContract.ICreate;
}): Promise<IHrmTimeTrackingEmployeeContract> {
  // 1. Validate the employee exists and is not soft-deleted
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: { id: true, deleted_at: true },
    });
  if (employee.deleted_at !== null) {
    throw new HttpException(
      "Cannot create contract for a deactivated employee",
      400,
    );
  }
  // 2. Check if the employee has an active contract (end_date IS NULL) that is not deleted
  const activeContract =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findFirst({
      where: {
        hrm_time_tracking_employee_id: props.employeeId,
        end_date: null,
        deleted_at: null,
      },
      select: { id: true },
    });
  // 3. If an active contract exists, automatically close it by setting end_date
  //    to one day before the new contract's start_date
  if (activeContract) {
    const startDateStr: string = props.body.startDate;
    // Parse ISO 8601 date components: "2026-04-26T06:42:17.039Z"
    const components: I_ISOComponents = parseIsoComponents(startDateStr);
    // Compute one day before
    const prevDateStr: string = computePreviousDayIsoDate(
      components.year,
      components.month,
      components.day,
    );
    const previousEndDateStr: string =
      prevDateStr + "T" + components.time + components.tz;
    const previousEndDate: string & tags.Format<"date-time"> = typia.assert<
      string & tags.Format<"date-time">
    >(previousEndDateStr);
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.update({
      where: { id: activeContract.id },
      data: {
        end_date: previousEndDate,
        updated_at: previousEndDate,
      },
    });
  }
  // 4. Create the new contract using the collector
  const record =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.create({
      data: await HrmTimeTrackingEmployeeContractCollector.collect({
        body: props.body,
        hrmTimeTrackingEmployees: { id: props.employeeId },
      }),
      ...HrmTimeTrackingEmployeeContractTransformer.select(),
    });
  // 5. Return the created contract using the transformer
  return await HrmTimeTrackingEmployeeContractTransformer.transform(record);
}
/**
 * Parsed ISO 8601 datetime components without using the Date type.
 */
interface I_ISOComponents {
  year: number;
  month: number;
  day: number;
  time: string; // "06:42:17.039"
  tz: string; // "Z" or "+09:00" etc.
}
/**
 * Parses an ISO 8601 date-time string into its numeric components.
 *
 * Input format: "2026-04-26T06:42:17.039Z"
 */
function parseIsoComponents(isoStr: string): I_ISOComponents {
  const year: number = parseInt(isoStr.substring(0, 4), 10);
  const month: number = parseInt(isoStr.substring(5, 7), 10);
  const day: number = parseInt(isoStr.substring(8, 10), 10);
  const time: string = isoStr.substring(11, 23); // "06:42:17.039"
  const tz: string = isoStr.substring(23); // "Z" or "+09:00"
  return { year, month, day, time, tz };
}
/**
 * Computes the ISO date part (YYYY-MM-DD) for the previous day.
 * Handles month boundaries, year boundaries, and leap years.
 * Returns only the date portion without time or timezone suffix.
 */
function computePreviousDayIsoDate(
  year: number,
  month: number,
  day: number,
): string {
  const daysInMonth: number[] = [
    31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
  ];
  // Adjust February for leap years
  if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
    daysInMonth[1] = 29;
  }
  let prevYear: number = year;
  let prevMonth: number = month;
  let prevDay: number = day - 1;
  if (prevDay < 1) {
    prevMonth = month - 1;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear = year - 1;
    }
    prevDay = daysInMonth[prevMonth - 1];
  }
  return (
    prevYear.toString().padStart(4, "0") +
    "-" +
    prevMonth.toString().padStart(2, "0") +
    "-" +
    prevDay.toString().padStart(2, "0")
  );
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
// export async function postHrmTimeTrackingEmployeesEmployeeIdContracts(props: {
//   employeeId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingEmployeeContract.ICreate;
// }): Promise<IHrmTimeTrackingEmployeeContract> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_employee_contracts.create({
//     data: await HrmTimeTrackingEmployeeContractCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmTimeTrackingEmployeeContractTransformer.select(),
//   });
//   return await HrmTimeTrackingEmployeeContractTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------