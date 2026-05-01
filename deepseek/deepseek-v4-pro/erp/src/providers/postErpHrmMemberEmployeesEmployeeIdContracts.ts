import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmContractCollector } from "../collectors/ErpHrmContractCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmContractTransformer } from "../transformers/ErpHrmContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IErpHrmContract.ICreate;
}): Promise<IErpHrmContract> {
  // 1. Verify employee exists and fetch organization context
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  // 2. Business validation
  if (props.body.pay_rate <= 0) {
    throw new HttpException("pay_rate must be greater than zero", 422);
  }
  if (props.body.working_hours_per_week <= 0) {
    throw new HttpException(
      "working_hours_per_week must be greater than zero",
      422,
    );
  }
  if (
    props.body.end_date != null &&
    props.body.start_date >= props.body.end_date
  ) {
    throw new HttpException("start_date must be before end_date", 422);
  }
  const validPayPeriods: string[] = ["hourly", "daily", "weekly", "monthly"];
  if (!validPayPeriods.includes(props.body.pay_period)) {
    throw new HttpException(
      "pay_period must be one of: hourly, daily, weekly, monthly",
      422,
    );
  }
  // 3. Auto-close previous active contract
  const now = new Date();
  const activeContract = await MyGlobal.prisma.erp_hrm_contracts.findFirst({
    where: {
      erp_hrm_employee_id: props.employeeId,
      start_date: { lte: now },
      deleted_at: null,
      OR: [{ end_date: null }, { end_date: { gte: now } }],
    },
    orderBy: { start_date: "desc" },
    select: { id: true },
  });
  if (activeContract !== null) {
    const newStartDate = new Date(props.body.start_date);
    const dayBefore = new Date(newStartDate.getTime() - 86400000);
    await MyGlobal.prisma.erp_hrm_contracts.update({
      where: { id: activeContract.id },
      data: {
        end_date: dayBefore,
        updated_at: now,
      },
    });
  }
  // 4. Create new contract
  const record = await MyGlobal.prisma.erp_hrm_contracts.create({
    data: await ErpHrmContractCollector.collect({
      body: props.body,
      erpHrmEmployees: { id: props.employeeId },
    }),
    ...ErpHrmContractTransformer.select(),
  });
  // 5. Record activity log
  await MyGlobal.prisma.erp_hrm_activity_logs.create({
    data: {
      id: v4(),
      erp_hrm_organization_id: employee.erp_hrm_organization_id,
      erp_hrm_member_id: props.member.id,
      action: "contract-created",
      target_type: "erp_hrm_contracts",
      target_id: record.id,
      details: JSON.stringify({
        employee_id: props.employeeId,
        start_date: props.body.start_date,
        pay_rate: props.body.pay_rate,
        pay_period: props.body.pay_period,
      }),
      created_at: now,
    } as unknown as Prisma.erp_hrm_activity_logsUncheckedCreateInput,
  });
  return await ErpHrmContractTransformer.transform(record);
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
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmMemberEmployeesEmployeeIdContracts(props: {
//   member: MemberPayload;
//   employeeId: string & tags.Format<"uuid">;
//   body: IErpHrmContract.ICreate;
// }): Promise<IErpHrmContract> {
//   const record = await MyGlobal.prisma.erp_hrm_contracts.create({
//     data: await ErpHrmContractCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmContractTransformer.select(),
//   });
//   return await ErpHrmContractTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------