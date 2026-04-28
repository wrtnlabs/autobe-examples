import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartmentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentSnapshotAtSummaryTransformer } from "../transformers/HrmPlatformDepartmentSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberDepartmentSnapshots(props: {
  member: MemberPayload;
  body: IHrmPlatformDepartmentSnapshot.IRequest;
}): Promise<IPageIHrmPlatformDepartmentSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const memberRecord =
    await MyGlobal.prisma.hrm_platform_members.findUniqueOrThrow({
      where: { id: props.member.id },
      select: {
        employees: {
          where: { deleted_at: null },
          select: { hrm_platform_organization_id: true },
          take: 1,
        },
      },
    });
  const organizationId =
    memberRecord.employees[0]?.hrm_platform_organization_id;
  if (!organizationId) {
    throw new HttpException("No active organization", 403);
  }
  const whereInput = {
    department: {
      hrm_platform_organization_id: organizationId,
    },
    ...(props.body.departmentId !== undefined && {
      hrm_platform_department_id: props.body.departmentId,
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
    ...(props.body.search !== undefined && {
      snapshot_name: { contains: props.body.search },
    }),
  } satisfies Prisma.hrm_platform_department_snapshotsWhereInput;
  const records =
    await MyGlobal.prisma.hrm_platform_department_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmPlatformDepartmentSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.hrm_platform_department_snapshots.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformDepartmentSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(
        total / (limit satisfies number as number),
      ) satisfies number as number,
    },
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
// import { IHrmPlatformDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentSnapshot";
// import { IPageIHrmPlatformDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartmentSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberDepartmentSnapshots(props: {
//   member: MemberPayload;
//   body: IHrmPlatformDepartmentSnapshot.IRequest;
// }): Promise<IPageIHrmPlatformDepartmentSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_department_snapshots.findMany({
//     ...HrmPlatformDepartmentSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformDepartmentSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------