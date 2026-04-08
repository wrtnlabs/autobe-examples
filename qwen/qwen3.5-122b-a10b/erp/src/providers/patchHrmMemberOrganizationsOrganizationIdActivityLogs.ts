import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActivityLog";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmActivityLogAtSummaryTransformer } from "../transformers/HrmActivityLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberOrganizationsOrganizationIdActivityLogs(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmActivityLog.IRequest;
}): Promise<IPageIHrmActivityLog.ISummary> {
  // Verify organization exists
  const organization = await MyGlobal.prisma.hrm_organizations.findUnique({
    where: { id: props.organizationId },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // Verify member has active employee record in this organization
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Verify member has org:manage permission through role
  const permission = await MyGlobal.prisma.hrm_permissions.findFirst({
    where: {
      permission_name: "org:manage",
    },
  });
  if (permission === null) {
    throw new HttpException("Forbidden", 403);
  }
  const rolePermission = await MyGlobal.prisma.hrm_role_permissions.findFirst({
    where: {
      hrm_role_id: employee.role_id,
      hrm_permission_id: permission.id,
    },
  });
  if (rolePermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause for activity logs
  const whereInput: Prisma.hrm_activity_logsWhereInput = {
    deleted_at: null,
    // Scope to organization through performer's employment
    hrmMember: {
      employee: {
        is: {
          organization_id: props.organizationId,
          deleted_at: null,
        },
      },
    },
    // Apply filters from request body
    ...(props.body.action_type !== undefined && {
      action_type: props.body.action_type,
    }),
    ...(props.body.performer_id !== undefined && {
      hrm_members_id: props.body.performer_id,
    }),
    ...(props.body.timestamp !== undefined && {
      timestamp: {
        ...(props.body.timestamp.gte !== undefined && {
          gte: new Date(props.body.timestamp.gte),
        }),
        ...(props.body.timestamp.lte !== undefined && {
          lte: new Date(props.body.timestamp.lte),
        }),
      },
    }),
  } satisfies Prisma.hrm_activity_logsWhereInput;
  // Pagination parameters with defaults and validation
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(0, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Sorting parameters with defaults
  const sortBy = props.body.sortBy ?? "timestamp";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput = {
    [sortBy]: sortOrder,
  } satisfies Prisma.hrm_activity_logsOrderByWithRelationInput;
  // Execute paginated query
  const records = await MyGlobal.prisma.hrm_activity_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmActivityLogAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.hrm_activity_logs.count({
    where: whereInput,
  });
  // Calculate pages
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data: await ArrayUtil.asyncMap(
      records,
      HrmActivityLogAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmActivityLog.ISummary;
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
// import { IHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActivityLog";
// import { IPageIHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmActivityLog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberOrganizationsOrganizationIdActivityLogs(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmActivityLog.IRequest;
// }): Promise<IPageIHrmActivityLog.ISummary> {
//   const records = await MyGlobal.prisma.hrm_activity_logs.findMany({
//     ...HrmActivityLogAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmActivityLogAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------