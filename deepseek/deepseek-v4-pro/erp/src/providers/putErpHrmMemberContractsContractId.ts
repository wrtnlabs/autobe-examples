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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmContractTransformer } from "../transformers/ErpHrmContractTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberContractsContractId(props: {
  member: MemberPayload;
  contractId: string & tags.Format<"uuid">;
  body: IErpHrmContract.IUpdate;
}): Promise<IErpHrmContract> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  const contract = await MyGlobal.prisma.erp_hrm_contracts.findUniqueOrThrow({
    where: { id: props.contractId },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      start_date: true,
      end_date: true,
      deleted_at: true,
      employee: {
        select: {
          id: true,
          erp_hrm_organization_id: true,
        },
      },
    },
  });
  if (
    contract.employee.erp_hrm_organization_id !==
    session.erp_hrm_organization_id
  ) {
    throw new HttpException("Not found", 404);
  }
  if (contract.deleted_at !== null) {
    throw new HttpException("Not found", 404);
  }
  const now: string = toISOStringSafe(new Date());
  const activeContract = await MyGlobal.prisma.erp_hrm_contracts.findFirst({
    where: {
      erp_hrm_employee_id: contract.erp_hrm_employee_id,
      deleted_at: null,
      start_date: { lte: now },
      OR: [{ end_date: null }, { end_date: { gte: now } }],
    },
    orderBy: { start_date: "desc" },
    select: { id: true },
  });
  if (!activeContract || activeContract.id !== props.contractId) {
    throw new HttpException(
      "Only the active contract can be edited. Past contracts are immutable historical records.",
      422,
    );
  }
  if (props.body.pay_rate !== undefined && props.body.pay_rate <= 0) {
    throw new HttpException("pay_rate must be greater than zero", 422);
  }
  if (
    props.body.pay_period !== undefined &&
    !["hourly", "daily", "weekly", "monthly"].includes(props.body.pay_period)
  ) {
    throw new HttpException(
      "pay_period must be one of: hourly, daily, weekly, monthly",
      422,
    );
  }
  if (
    props.body.working_hours_per_week !== undefined &&
    props.body.working_hours_per_week <= 0
  ) {
    throw new HttpException(
      "working_hours_per_week must be greater than zero",
      422,
    );
  }
  const effectiveStartDate: string =
    props.body.start_date !== undefined
      ? props.body.start_date
      : toISOStringSafe(contract.start_date);
  const effectiveEndDate: string | null =
    props.body.end_date !== undefined
      ? props.body.end_date
      : contract.end_date !== null
        ? toISOStringSafe(contract.end_date)
        : null;
  if (effectiveEndDate !== null && effectiveStartDate >= effectiveEndDate) {
    throw new HttpException("start_date must be before end_date", 422);
  }
  await MyGlobal.prisma.erp_hrm_contracts.update({
    where: { id: props.contractId },
    data: {
      ...(props.body.start_date !== undefined && {
        start_date: props.body.start_date,
      }),
      ...(props.body.end_date !== undefined && {
        end_date: props.body.end_date,
      }),
      ...(props.body.pay_rate !== undefined && {
        pay_rate: props.body.pay_rate,
      }),
      ...(props.body.pay_period !== undefined && {
        pay_period: props.body.pay_period,
      }),
      ...(props.body.working_hours_per_week !== undefined && {
        working_hours_per_week: props.body.working_hours_per_week,
      }),
      ...(props.body.notes !== undefined && {
        notes: props.body.notes,
      }),
      updated_at: now,
    },
  });
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
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putErpHrmMemberContractsContractId(props: {
//   member: MemberPayload;
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