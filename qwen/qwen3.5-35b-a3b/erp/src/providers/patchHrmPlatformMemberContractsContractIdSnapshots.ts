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
  // Verify contract exists
  const contract =
    await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
      where: { id: props.contractId },
      select: { hrm_platform_employee_id: true },
    });
  // Verify authorization - member must own the contract
  if (contract.hrm_platform_employee_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build filters from request body
  const where: Prisma.hrm_platform_contracts_snapshotsWhereInput = {
    hrm_platform_contract_id: props.contractId,
    ...(props.body.contract_number !== undefined && {
      contract_number: { contains: props.body.contract_number },
    }),
    ...(props.body.start_date_from !== undefined && {
      start_date: { gte: props.body.start_date_from },
    }),
    ...(props.body.start_date_to !== undefined && {
      start_date: { lte: props.body.start_date_to },
    }),
    ...(props.body.end_date_from !== undefined &&
      props.body.end_date_from !== null && {
        end_date: { gte: props.body.end_date_from },
      }),
    ...(props.body.end_date_to !== undefined &&
      props.body.end_date_to !== null && {
        end_date: { lte: props.body.end_date_to },
      }),
    ...(props.body.snapshotted_at_from !== undefined && {
      snapshotted_at: { gte: props.body.snapshotted_at_from },
    }),
    ...(props.body.snapshotted_at_to !== undefined && {
      snapshotted_at: { lte: props.body.snapshotted_at_to },
    }),
  };
  // Build sort order
  const orderBy: Prisma.hrm_platform_contracts_snapshotsOrderByWithRelationInput =
    props.body.sort === "contract_number"
      ? ({ contract_number: "asc" } as const)
      : props.body.sort === "-contract_number"
        ? ({ contract_number: "desc" } as const)
        : props.body.sort === "start_date"
          ? ({ start_date: "asc" } as const)
          : props.body.sort === "-start_date"
            ? ({ start_date: "desc" } as const)
            : props.body.sort === "created_at"
              ? ({ created_at: "asc" } as const)
              : props.body.sort === "-created_at"
                ? ({ created_at: "desc" } as const)
                : ({ snapshotted_at: "desc" } as const);
  // Query snapshots
  const [data, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_contracts_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...HrmPlatformContractsSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_platform_contracts_snapshots.count({ where }),
  ]);
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  // Transform and return
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
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