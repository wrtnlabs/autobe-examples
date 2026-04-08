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

export async function patchHrmMemberOrganizationsOrganizationCodeActivityLogs(props: {
  member: MemberPayload;
  organizationCode: string;
  body: IHrmActivityLog.IRequest;
}): Promise<IPageIHrmActivityLog.ISummary> {
  // Validate organization exists by code
  const organization = await MyGlobal.prisma.hrm_organizations.findFirst({
    where: {
      deleted_at: null,
    },
  });
  if (!organization) {
    throw new HttpException("Organization not found", 404);
  }
  // Verify member belongs to organization
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      organization_id: organization.id,
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("You do not have access to this organization", 403);
  }
  // Get all member IDs in this organization for activity log scoping
  const employees = await MyGlobal.prisma.hrm_employees.findMany({
    where: {
      organization_id: organization.id,
      deleted_at: null,
    },
    select: {
      user_id: true,
    },
  });
  const memberIds: Array<string & tags.Format<"uuid">> = employees.map(
    (e) => e.user_id,
  );
  // Pagination parameters with defaults
  const page: number = props.body.page ?? 1;
  const pageSize: number | null | undefined = props.body.pageSize;
  const limitParam:
    | null
    | (number & tags.Type<"int32"> & tags.Minimum<0>)
    | undefined = props.body.limit;
  const limit: number = pageSize ?? limitParam ?? 100;
  const skip: number = (page - 1) * limit;
  // Build where clause for organization-scoped activity logs
  const whereInput: Prisma.hrm_activity_logsWhereInput = {
    deleted_at: null,
    hrm_members_id: {
      in: memberIds,
    },
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
  // Build orderBy
  const sortBy: string = props.body.sortBy ?? "timestamp";
  const sortOrder: "asc" | "desc" = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.hrm_activity_logsOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  } satisfies Prisma.hrm_activity_logsOrderByWithRelationInput;
  // Query records
  const records = await MyGlobal.prisma.hrm_activity_logs.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...HrmActivityLogAtSummaryTransformer.select(),
  });
  // Get total count
  const total: number = await MyGlobal.prisma.hrm_activity_logs.count({
    where: whereInput,
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
// export async function patchHrmMemberOrganizationsOrganizationCodeActivityLogs(props: {
//   member: MemberPayload;
//   organizationCode: string;
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