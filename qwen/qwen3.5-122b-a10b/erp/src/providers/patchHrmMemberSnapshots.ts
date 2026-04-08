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

export async function patchHrmMemberSnapshots(props: {
  member: MemberPayload;
  body: IHrmContractSnapshot.IRequest;
}): Promise<IPageIHrmContractSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_contract_snapshotsWhereInput = {
    ...(props.body.hrm_contract_id !== undefined && {
      hrm_contract_id: props.body.hrm_contract_id,
    }),
    ...(props.body.employee_id !== undefined && {
      employee_id: props.body.employee_id,
    }),
    ...(props.body.start_date_from !== undefined ||
    props.body.start_date_to !== undefined
      ? {
          start_date: {
            ...(props.body.start_date_from !== undefined && {
              gte: new Date(props.body.start_date_from),
            }),
            ...(props.body.start_date_to !== undefined && {
              lte: new Date(props.body.start_date_to),
            }),
          },
        }
      : {}),
    ...(props.body.pay_period !== undefined && {
      pay_period: props.body.pay_period,
    }),
    ...(props.body.pay_rate_min !== undefined ||
    props.body.pay_rate_max !== undefined
      ? {
          pay_rate: {
            ...(props.body.pay_rate_min !== undefined && {
              gte: props.body.pay_rate_min,
            }),
            ...(props.body.pay_rate_max !== undefined && {
              lte: props.body.pay_rate_max,
            }),
          },
        }
      : {}),
    ...(props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined && {
              gte: new Date(props.body.created_at_from),
            }),
            ...(props.body.created_at_to !== undefined && {
              lte: new Date(props.body.created_at_to),
            }),
          },
        }
      : {}),
  };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.hrm_contract_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmContractSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_contract_snapshots.count({
      where: whereInput,
    }),
  ]);
  const data = await ArrayUtil.asyncMap(
    records,
    HrmContractSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
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
// export async function patchHrmMemberSnapshots(props: {
//   member: MemberPayload;
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