import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContractsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractsSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformContractsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContractsSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformContractsSnapshotAtSummaryTransformer } from "../transformers/HrmPlatformContractsSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberContractsContractIdSnapshots(props: {
  member: MemberPayload;
  contractId: string & tags.Format<"uuid">;
  body: IHrmPlatformContractsSnapshot.IRequest;
}): Promise<IPageIHrmPlatformContractsSnapshot.ISummary> {
  const contract =
    await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        hrm_platform_organization_id: true,
      },
    });
  const employeeId = contract.hrm_platform_employee_id;
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: { id: employeeId, deleted_at: null },
    select: { id: true, hrm_platform_member_id: true },
  });
  if (employee === null) {
    throw new HttpException("Contract employee not found", 404);
  }
  const isOwnContract = employee.hrm_platform_member_id === props.member.id;
  if (!isOwnContract) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const allowedSortFields = [
    "snapshotted_at",
    "-snapshotted_at",
    "contract_number",
    "-contract_number",
    "start_date",
    "-start_date",
    "created_at",
    "-created_at",
  ] as const;
  const sort = props.body.sort ?? "-snapshotted_at";
  const sortOrder = sort.startsWith("-") ? "desc" : "asc";
  const sortField = sort.startsWith("-") ? sort.substring(1) : sort;
  if (!allowedSortFields.includes(sort as (typeof allowedSortFields)[number])) {
    throw new HttpException("Invalid sort field", 400);
  }
  const orderByInput: Prisma.hrm_platform_contracts_snapshotsOrderByWithRelationInput =
    {
      [sortField]: sortOrder,
    } satisfies Prisma.hrm_platform_contracts_snapshotsOrderByWithRelationInput;
  const dateFilterConditions: Prisma.hrm_platform_contracts_snapshotsWhereInput[] =
    [];
  if (props.body.contract_number !== undefined) {
    dateFilterConditions.push({
      contract_number: { contains: props.body.contract_number },
    });
  }
  if (
    props.body.start_date_from !== undefined ||
    props.body.start_date_to !== undefined
  ) {
    const startDateFilter: Prisma.DateTimeFilter<"hrm_platform_contracts_snapshots"> =
      {};
    if (props.body.start_date_from !== undefined) {
      startDateFilter.gte = new Date(props.body.start_date_from);
    }
    if (props.body.start_date_to !== undefined) {
      startDateFilter.lte = new Date(props.body.start_date_to);
    }
    dateFilterConditions.push({ start_date: startDateFilter });
  }
  if (
    props.body.end_date_from !== undefined ||
    props.body.end_date_to !== undefined
  ) {
    const endDateFilter: Prisma.DateTimeNullableFilter<"hrm_platform_contracts_snapshots"> =
      {};
    if (
      props.body.end_date_from !== undefined &&
      props.body.end_date_from !== null
    ) {
      endDateFilter.gte = new Date(props.body.end_date_from);
    }
    if (
      props.body.end_date_to !== undefined &&
      props.body.end_date_to !== null
    ) {
      endDateFilter.lte = new Date(props.body.end_date_to);
    }
    dateFilterConditions.push({ end_date: endDateFilter });
  }
  if (
    props.body.snapshotted_at_from !== undefined ||
    props.body.snapshotted_at_to !== undefined
  ) {
    const snapshottedAtFilter: Prisma.DateTimeFilter<"hrm_platform_contracts_snapshots"> =
      {};
    if (props.body.snapshotted_at_from !== undefined) {
      snapshottedAtFilter.gte = new Date(props.body.snapshotted_at_from);
    }
    if (props.body.snapshotted_at_to !== undefined) {
      snapshottedAtFilter.lte = new Date(props.body.snapshotted_at_to);
    }
    dateFilterConditions.push({ snapshotted_at: snapshottedAtFilter });
  }
  const whereInput: Prisma.hrm_platform_contracts_snapshotsWhereInput = {
    hrm_platform_contract_id: contract.id,
    ...(dateFilterConditions.length > 0 && { AND: dateFilterConditions }),
  };
  const data = await MyGlobal.prisma.hrm_platform_contracts_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmPlatformContractsSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_contracts_snapshots.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformContractsSnapshotAtSummaryTransformer.transform,
    ),
  };
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
// import { IPageIHrmPlatformContractsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContractsSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberContractsContractIdSnapshots(props: {
//   member: MemberPayload;
//   contractId: string & tags.Format<"uuid">;
//   body: IHrmPlatformContractsSnapshot.IRequest;
// }): Promise<IPageIHrmPlatformContractsSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_contracts_snapshots.findMany({
//     ...HrmPlatformContractsSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformContractsSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------