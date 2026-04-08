import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectMembership";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectMembershipAtSummaryTransformer } from "../transformers/HrmPlatformProjectMembershipAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberProjectsProjectIdMemberships(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProjectMembership.IRequest;
}): Promise<IPageIHrmPlatformProjectMembership.ISummary> {
  const page: number =
    Math.max(props.body.page ?? 1, 1) &
    ({} as number & tags.Type<"int32"> & tags.Minimum<1>);
  const limit: number =
    Math.min(props.body.limit ?? 100, 100) &
    ({} as number & tags.Type<"int32"> & tags.Maximum<100>) &
    ({} as number & tags.Type<"int32"> & tags.Minimum<1>);
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_project_membershipsWhereInput = {
    hrm_platform_project_id: props.projectId,
    deleted_at: null,
  };
  if (props.body.role !== undefined) {
    whereInput.role = props.body.role;
  }
  if (props.body.employeeId !== undefined) {
    whereInput.hrm_platform_employee_id = props.body.employeeId;
  }
  if (props.body.startDate !== undefined || props.body.endDate !== undefined) {
    const dateFilter: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    } = {};
    if (props.body.startDate !== undefined) {
      dateFilter.gte = props.body.startDate;
    }
    if (props.body.endDate !== undefined) {
      dateFilter.lte = props.body.endDate;
    }
    whereInput.created_at = dateFilter;
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_project_memberships.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmPlatformProjectMembershipAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_platform_project_memberships.count({
      where: whereInput,
    }),
  ]);
  const totalPages: number = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformProjectMembershipAtSummaryTransformer.transform,
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
// import { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
// import { IPageIHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectMembership";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberProjectsProjectIdMemberships(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IHrmPlatformProjectMembership.IRequest;
// }): Promise<IPageIHrmPlatformProjectMembership.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_project_memberships.findMany({
//     ...HrmPlatformProjectMembershipAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformProjectMembershipAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------