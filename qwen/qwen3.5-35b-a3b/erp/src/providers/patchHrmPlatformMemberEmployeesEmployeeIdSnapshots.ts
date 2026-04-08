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
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: {
        id: true,
        hrm_platform_member_id: true,
        hrm_platform_organization_id: true,
      },
    });
  if (employee.hrm_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findFirstOrThrow({
      where: {
        id: props.member.session_id,
        expired_at: { gt: toISOStringSafe(new Date()) },
        hrm_platform_member_id: props.member.id,
        member: {
          id: props.member.id,
          is_active: true,
          deleted_at: null,
        },
      },
      include: {
        organization: true,
      },
    });
  if (!session.organization) {
    throw new HttpException("Forbidden", 403);
  }
  if (employee.hrm_platform_organization_id !== session.organization.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_employees_snapshotsWhereInput = {
    employee_id: props.employeeId,
  };
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  if (props.body.employment_type !== undefined) {
    whereInput.employment_type = props.body.employment_type;
  }
  if (props.body.startDate !== undefined || props.body.endDate !== undefined) {
    if (
      props.body.startDate !== undefined &&
      props.body.endDate !== undefined
    ) {
      whereInput.created_at = {
        AND: [
          {
            gte: props.body.startDate,
          } as Prisma.DateTimeFilter<"hrm_platform_employees_snapshots">,
          {
            lte: props.body.endDate,
          } as Prisma.DateTimeFilter<"hrm_platform_employees_snapshots">,
        ],
      } as Prisma.DateTimeFilter<"hrm_platform_employees_snapshots">;
    } else if (props.body.startDate !== undefined) {
      whereInput.created_at = { gte: props.body.startDate };
    } else if (props.body.endDate !== undefined) {
      whereInput.created_at = { lte: props.body.endDate };
    }
  }
  const sortOrder: "asc" | "desc" =
    props.body.sortOrder === "asc" ? "asc" : "desc";
  const defaultOrderBy: Prisma.hrm_platform_employees_snapshotsOrderByWithRelationInput =
    { created_at: "desc" };
  const orderByInput: Prisma.hrm_platform_employees_snapshotsOrderByWithRelationInput =
    props.body.sortBy === "created_at"
      ? { created_at: sortOrder }
      : props.body.sortBy === "id"
        ? { id: sortOrder }
        : props.body.sortBy === "position"
          ? { position: sortOrder }
          : props.body.sortBy === "employment_type"
            ? { employment_type: sortOrder }
            : props.body.sortBy === "status"
              ? { status: sortOrder }
              : defaultOrderBy;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_employees_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmPlatformEmployeesSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_platform_employees_snapshots.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
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