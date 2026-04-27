import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingRoleAtSummaryTransformer } from "../transformers/HrmTimeTrackingRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchHrmTimeTrackingMemberOrganizationsOrganizationIdRoles(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingRole.IRequest;
}): Promise<IPageIHrmTimeTrackingRole.ISummary> {
  // Verify organization exists — throws 404 if not found
  await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
    where: { id: props.organizationId },
    select: { id: true },
  });
  // Parse pagination defaults
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  // Build WHERE clause with multi-tenant isolation
  const whereInput: Prisma.hrm_time_tracking_rolesWhereInput = {
    hrm_time_tracking_organization_id: props.organizationId,
    deleted_at: null,
    ...(props.body.search !== undefined && {
      name: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.type !== undefined && {
      type: props.body.type,
    }),
  } satisfies Prisma.hrm_time_tracking_rolesWhereInput;
  // Get total count matching the filter (sequential, not parallel)
  const total: number = await MyGlobal.prisma.hrm_time_tracking_roles.count({
    where: whereInput,
  });
  // Get paginated records with transformer select for proper relation/aggregate loading
  const records = await MyGlobal.prisma.hrm_time_tracking_roles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: parseSort(props.body.sort),
    ...HrmTimeTrackingRoleAtSummaryTransformer.select(),
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackingRoleAtSummaryTransformer.transform,
    ),
  };
}
/**
 * Parse sort string in "column.direction" format.
 *
 * Valid columns: name, created_at, type
 * Valid directions: asc, desc
 * Default: created_at.desc
 */
function parseSort(
  sort: string | undefined,
): Prisma.hrm_time_tracking_rolesOrderByWithRelationInput {
  if (sort === undefined) {
    return { created_at: "desc" };
  }
  const [column, direction] = sort.split(".");
  const dir: "asc" | "desc" = direction === "asc" ? "asc" : "desc";
  switch (column) {
    case "name":
      return { name: dir };
    case "created_at":
      return { created_at: dir };
    case "type":
      return { type: dir };
    default:
      return { created_at: "desc" };
  }
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
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IPageIHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingRole";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingMemberOrganizationsOrganizationIdRoles(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingRole.IRequest;
// }): Promise<IPageIHrmTimeTrackingRole.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_roles.findMany({
//     ...HrmTimeTrackingRoleAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingRoleAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------