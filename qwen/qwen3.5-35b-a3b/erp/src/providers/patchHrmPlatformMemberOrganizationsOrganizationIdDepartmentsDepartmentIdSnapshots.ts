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
  // Validate organization exists
  await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
    where: { id: props.organizationId, deleted_at: null },
  });
  // Validate department exists within organization
  const department =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: {
        id: props.departmentId,
        organization_id: props.organizationId,
      },
    });
  // Build where clause with filters
  const whereInput = {
    hrm_platform_department_id: props.departmentId,
    ...(props.body.search !== undefined && {
      name: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.fiscal_start_month !== undefined && {
      fiscal_start_month: props.body.fiscal_start_month,
    }),
    ...((props.body.created_at_from !== undefined ||
      props.body.created_at_to !== undefined) && {
      created_at: {
        ...(props.body.created_at_from !== undefined && {
          gte: new Date(props.body.created_at_from),
        }),
        ...(props.body.created_at_to !== undefined && {
          lte: new Date(props.body.created_at_to),
        }),
      },
    }),
  } satisfies Prisma.hrm_platform_departments_snapshotsWhereInput;
  // Build orderBy input
  const orderByInput =
    props.body.sort_by !== undefined && props.body.sort_order !== undefined
      ? ({
          [props.body.sort_by]:
            props.body.sort_order === "asc" ? "asc" : "desc",
        } satisfies Prisma.hrm_platform_departments_snapshotsOrderByWithRelationInput)
      : ({
          created_at: "desc",
        } satisfies Prisma.hrm_platform_departments_snapshotsOrderByWithRelationInput);
  // Get page and limit
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Query data
  const data =
    await MyGlobal.prisma.hrm_platform_departments_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...HrmPlatformDepartmentsSnapshotAtSummaryTransformer.select(),
    });
  // Count total
  const total = await MyGlobal.prisma.hrm_platform_departments_snapshots.count({
    where: whereInput,
  });
  // Transform and return
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
    data: await HrmPlatformDepartmentsSnapshotAtSummaryTransformer.transformAll(
      data,
    ),
  } satisfies IPageIHrmPlatformDepartmentsSnapshot.ISummary;
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