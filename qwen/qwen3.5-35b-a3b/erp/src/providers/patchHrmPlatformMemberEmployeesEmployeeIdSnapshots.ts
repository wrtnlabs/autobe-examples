import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployeesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeesSnapshot";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformEmployeesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeesSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeesSnapshotAtSummaryTransformer } from "../transformers/HrmPlatformEmployeesSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberEmployeesEmployeeIdSnapshots(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmPlatformEmployeesSnapshot.IRequest;
}): Promise<IPageIHrmPlatformEmployeesSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: {
        id: props.employeeId,
      },
      select: {
        id: true,
        organization: {
          select: {
            id: true,
          },
        },
      },
    });
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findFirstOrThrow({
      where: {
        id: props.member.session_id,
      },
      select: {
        id: true,
        organization: {
          select: {
            id: true,
          },
        },
      },
    });
  if (
    !session.organization ||
    employee.organization.id !== session.organization.id
  ) {
    throw new HttpException(
      "Employee does not belong to your organization",
      404,
    );
  }
  const whereInput: Prisma.hrm_platform_employees_snapshotsWhereInput = {
    employee_id: props.employeeId,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.employment_type !== undefined && {
      employment_type: props.body.employment_type,
    }),
    ...(props.body.startDate !== undefined && {
      created_at: { gte: props.body.startDate! },
    }),
    ...(props.body.endDate !== undefined && {
      created_at: { lte: props.body.endDate! },
    }),
  };
  const orderBy: Prisma.hrm_platform_employees_snapshotsOrderByWithRelationInput[] =
    [
      {
        created_at: props.body.sortOrder === "asc" ? "asc" : "desc",
      },
    ];
  const records =
    await MyGlobal.prisma.hrm_platform_employees_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderBy,
      ...HrmPlatformEmployeesSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.hrm_platform_employees_snapshots.count({
    where: whereInput,
  });
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    pagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformEmployeesSnapshotAtSummaryTransformer.transform,
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
// import { IHrmPlatformEmployeesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeesSnapshot";
// import { IPageIHrmPlatformEmployeesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeesSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberEmployeesEmployeeIdSnapshots(props: {
//   member: MemberPayload;
//   employeeId: string & tags.Format<"uuid">;
//   body: IHrmPlatformEmployeesSnapshot.IRequest;
// }): Promise<IPageIHrmPlatformEmployeesSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_employees_snapshots.findMany({
//     ...HrmPlatformEmployeesSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformEmployeesSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------