import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeSnapshot";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployeeSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingEmployeeSnapshotAtSummaryTransformer } from "../transformers/HrmTimeTrackingEmployeeSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingEmployeesEmployeeIdSnapshots(props: {
  employeeId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingEmployeeSnapshot.IRequest;
}): Promise<IPageIHrmTimeTrackingEmployeeSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    select: { id: true },
  });
  const where: Prisma.hrm_time_tracking_employee_snapshotsWhereInput = {
    hrm_time_tracking_employee_id: props.employeeId,
  };
  if (props.body.changed_field !== undefined) {
    where.changed_field = props.body.changed_field;
  }
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    where.created_at = {
      ...(props.body.created_at_from !== undefined
        ? { gte: props.body.created_at_from }
        : {}),
      ...(props.body.created_at_to !== undefined
        ? { lte: props.body.created_at_to }
        : {}),
    };
  }
  if (props.body.search !== undefined) {
    where.OR = [
      { changed_field: { contains: props.body.search, mode: "insensitive" } },
      { old_value: { contains: props.body.search, mode: "insensitive" } },
      { new_value: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  let orderBy: Prisma.hrm_time_tracking_employee_snapshotsOrderByWithRelationInput =
    {
      created_at: "desc",
    };
  if (props.body.sort !== undefined) {
    const colonIndex = props.body.sort.indexOf(":");
    const field =
      colonIndex !== -1
        ? props.body.sort.substring(0, colonIndex)
        : props.body.sort;
    const direction =
      colonIndex !== -1 ? props.body.sort.substring(colonIndex + 1) : "desc";
    if (field === "changed_field") {
      orderBy = {
        changed_field: direction === "asc" ? "asc" : "desc",
      };
    } else {
      orderBy = {
        created_at: direction === "asc" ? "asc" : "desc",
      };
    }
  }
  const total =
    await MyGlobal.prisma.hrm_time_tracking_employee_snapshots.count({
      where,
    });
  const records =
    await MyGlobal.prisma.hrm_time_tracking_employee_snapshots.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...HrmTimeTrackingEmployeeSnapshotAtSummaryTransformer.select(),
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.floor((total - 1) / limit) + 1,
    },
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackingEmployeeSnapshotAtSummaryTransformer.transform,
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
// import { IHrmTimeTrackingEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeSnapshot";
// import { IPageIHrmTimeTrackingEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployeeSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingEmployeesEmployeeIdSnapshots(props: {
//   employeeId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingEmployeeSnapshot.IRequest;
// }): Promise<IPageIHrmTimeTrackingEmployeeSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_employee_snapshots.findMany({
//     ...HrmTimeTrackingEmployeeSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingEmployeeSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------