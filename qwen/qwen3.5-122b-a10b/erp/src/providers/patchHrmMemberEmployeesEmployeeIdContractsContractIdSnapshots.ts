import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContractSnapshot";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmContractSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmContractSnapshotAtSummaryTransformer } from "../transformers/HrmContractSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberEmployeesEmployeeIdContractsContractIdSnapshots(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  contractId: string & tags.Format<"uuid">;
  body: IHrmContractSnapshot.IRequest;
}): Promise<IPageIHrmContractSnapshot.ISummary> {
  const contract = await MyGlobal.prisma.hrm_contracts.findUnique({
    where: { id: props.contractId },
    select: { hrm_employee_id: true },
  });
  if (!contract || contract.hrm_employee_id !== props.employeeId) {
    throw new HttpException(
      "Contract not found or does not belong to employee",
      404,
    );
  }
  const where: Prisma.hrm_contract_snapshotsWhereInput = {
    hrm_contract_id: props.contractId,
    ...(props.body.employee_id !== undefined && {
      employee_id: props.body.employee_id,
    }),
    ...(props.body.start_date_from !== undefined && {
      start_date: { gte: props.body.start_date_from },
    }),
    ...(props.body.start_date_to !== undefined && {
      start_date: { lte: props.body.start_date_to },
    }),
    ...(props.body.pay_period !== undefined && {
      pay_period: props.body.pay_period,
    }),
    ...(props.body.pay_rate_min !== undefined && {
      pay_rate: { gte: props.body.pay_rate_min },
    }),
    ...(props.body.pay_rate_max !== undefined && {
      pay_rate: { lte: props.body.pay_rate_max },
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: props.body.created_at_from },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: props.body.created_at_to },
    }),
  };
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const records = await MyGlobal.prisma.hrm_contract_snapshots.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...HrmContractSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_contract_snapshots.count({ where });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      HrmContractSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmContractSnapshot.ISummary;
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
// import { IHrmContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContractSnapshot";
// import { IPageIHrmContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmContractSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberEmployeesEmployeeIdContractsContractIdSnapshots(props: {
//   member: MemberPayload;
//   employeeId: string & tags.Format<"uuid">;
//   contractId: string & tags.Format<"uuid">;
//   body: IHrmContractSnapshot.IRequest;
// }): Promise<IPageIHrmContractSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.hrm_contract_snapshots.findMany({
//     ...HrmContractSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmContractSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------