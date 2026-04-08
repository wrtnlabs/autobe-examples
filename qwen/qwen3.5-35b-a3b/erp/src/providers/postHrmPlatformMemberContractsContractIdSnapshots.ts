import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContractsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractsSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberContractsContractIdSnapshots(props: {
  member: MemberPayload;
  contractId: string & tags.Format<"uuid">;
  body: IHrmPlatformContractsSnapshot.ICreate;
}): Promise<IHrmPlatformContractsSnapshot> {
  const contract =
    await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      include: {
        employee: true,
      },
    });
  const employee = contract.employee;
  const record = await MyGlobal.prisma.hrm_platform_contracts_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      hrm_platform_contract_id: props.contractId,
      contract_number: v4() as string & tags.Format<"uuid">,
      start_date: contract.start_date,
      end_date: contract.end_date ?? null,
      job_title: employee.job_title ?? "",
      department_id: employee.hrm_platform_department_id ?? null,
      compensation_amount: contract.compensation_amount ?? 0,
      compensation_currency: contract.compensation_currency ?? "USD",
      compensation_frequency: "monthly",
      benefits_description: contract.notes ?? null,
      probation_period_days: null,
      notice_period_days: null,
      work_location: null,
      work_type: "full-time",
      notes: contract.notes ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      snapshotted_at: new Date(),
    },
    select: {
      id: true,
      hrm_platform_contract_id: true,
      contract_number: true,
      start_date: true,
      end_date: true,
      job_title: true,
      department_id: true,
      compensation_amount: true,
      compensation_currency: true,
      compensation_frequency: true,
      benefits_description: true,
      probation_period_days: true,
      notice_period_days: true,
      work_location: true,
      work_type: true,
      notes: true,
      created_at: true,
      updated_at: true,
      snapshotted_at: true,
    },
  });
  return {
    id: record.id,
    hrm_platform_contract_id: record.hrm_platform_contract_id,
    contract_number: record.contract_number,
    start_date: toISOStringSafe(record.start_date),
    end_date:
      record.end_date !== null ? toISOStringSafe(record.end_date) : null,
    job_title: record.job_title,
    department_id: record.department_id ?? null,
    compensation_amount: Number(record.compensation_amount),
    compensation_currency: record.compensation_currency,
    compensation_frequency: record.compensation_frequency,
    benefits_description: record.benefits_description ?? null,
    probation_period_days: record.probation_period_days ?? null,
    notice_period_days: record.notice_period_days ?? null,
    work_location: record.work_location ?? null,
    work_type: record.work_type,
    notes: record.notes ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    snapshotted_at: toISOStringSafe(record.snapshotted_at),
  } satisfies IHrmPlatformContractsSnapshot;
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
// import { IHrmPlatformContractsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractsSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmPlatformMemberContractsContractIdSnapshots(props: {
//   member: MemberPayload;
//   contractId: string & tags.Format<"uuid">;
//   body: IHrmPlatformContractsSnapshot.ICreate;
// }): Promise<IHrmPlatformContractsSnapshot> {
//   const record = await MyGlobal.prisma.hrm_platform_contracts_snapshots.create({
//     data: await HrmPlatformContractsSnapshotCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmPlatformContractsSnapshotTransformer.select(),
//   });
//   return await HrmPlatformContractsSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------