import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformDepartmentsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentsSnapshot";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformDepartmentsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartmentsSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentsSnapshotAtSummaryTransformer } from "../transformers/HrmPlatformDepartmentsSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberOrganizationsOrganizationIdDepartmentsDepartmentIdSnapshots(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  departmentId: string & tags.Format<"uuid">;
  body: IHrmPlatformDepartmentsSnapshot.IRequest;
}): Promise<IPageIHrmPlatformDepartmentsSnapshot.ISummary> {
  await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
    where: {
      id: props.departmentId,
      organization_id: props.organizationId,
    },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereFilter: Prisma.hrm_platform_departments_snapshotsWhereInput = {
    hrm_platform_department_id: props.departmentId,
  };
  if (props.body.status !== undefined) {
    whereFilter.status = props.body.status;
  }
  if (props.body.fiscal_start_month !== undefined) {
    whereFilter.fiscal_start_month = props.body.fiscal_start_month;
  }
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    whereFilter.created_at = {
      ...(props.body.created_at_from !== undefined && {
        gte: toISOStringSafe(props.body.created_at_from),
      }),
      ...(props.body.created_at_to !== undefined && {
        lte: toISOStringSafe(props.body.created_at_to),
      }),
    } as Prisma.DateTimeFilter<"hrm_platform_departments_snapshots">;
  }
  const orderByInput: Prisma.hrm_platform_departments_snapshotsOrderByWithRelationInput =
    (() => {
      const sortBy = props.body.sort_by ?? "created_at";
      const sortOrder = props.body.sort_order ?? "desc";
      const orderDir =
        sortOrder === "asc" ? ("asc" as const) : ("desc" as const);
      if (sortBy === "name") {
        return { name: orderDir };
      }
      if (sortBy === "fiscal_start_month") {
        return { fiscal_start_month: orderDir };
      }
      return { created_at: orderDir };
    })();
  const records =
    await MyGlobal.prisma.hrm_platform_departments_snapshots.findMany({
      where: whereFilter,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmPlatformDepartmentsSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.hrm_platform_departments_snapshots.count({
    where: whereFilter,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await HrmPlatformDepartmentsSnapshotAtSummaryTransformer.transformAll(
      records,
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
// import { IHrmPlatformDepartmentsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentsSnapshot";
// import { IPageIHrmPlatformDepartmentsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartmentsSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberOrganizationsOrganizationIdDepartmentsDepartmentIdSnapshots(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   departmentId: string & tags.Format<"uuid">;
//   body: IHrmPlatformDepartmentsSnapshot.IRequest;
// }): Promise<IPageIHrmPlatformDepartmentsSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_departments_snapshots.findMany({
//     ...HrmPlatformDepartmentsSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await HrmPlatformDepartmentsSnapshotAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------