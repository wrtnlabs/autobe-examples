import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationFile";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganizationFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingOrganizationFileAtSummaryTransformer } from "../transformers/HrmTimeTrackingOrganizationFileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberOrganizationsOrganizationIdFiles(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingOrganizationFile.IRequest;
}): Promise<IPageIHrmTimeTrackingOrganizationFile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  /**
   * Build WHERE clause with conditional filters.
   * Organization scope always applied; all other filters optional.
   */
  const where = {
    hrm_time_tracking_organization_id: props.organizationId,
    ...(props.body.include_deleted !== true ? { deleted_at: null } : {}),
    ...(props.body.type !== undefined ? { type: props.body.type } : {}),
    ...(props.body.name !== undefined
      ? { name: { contains: props.body.name, mode: "insensitive" as const } }
      : {}),
    ...(props.body.extension !== undefined
      ? { extension: props.body.extension }
      : {}),
    ...(props.body.mime_type !== undefined
      ? {
          mime_type: {
            startsWith: props.body.mime_type,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(props.body.size_min !== undefined && props.body.size_max !== undefined
      ? { size: { gte: props.body.size_min, lte: props.body.size_max } }
      : props.body.size_min !== undefined
        ? { size: { gte: props.body.size_min } }
        : props.body.size_max !== undefined
          ? { size: { lte: props.body.size_max } }
          : {}),
    ...(props.body.created_at_start !== undefined &&
    props.body.created_at_end !== undefined
      ? {
          created_at: {
            gte: props.body.created_at_start,
            lte: props.body.created_at_end,
          },
        }
      : props.body.created_at_start !== undefined
        ? { created_at: { gte: props.body.created_at_start } }
        : props.body.created_at_end !== undefined
          ? { created_at: { lte: props.body.created_at_end } }
          : {}),
  } satisfies Prisma.hrm_time_tracking_organization_filesWhereInput;
  /**
   * Build ORDER BY with whitelist validation.
   * No type assertions used — explicit union type for field selection.
   */
  const sortCandidate = props.body.sort ?? "created_at";
  const sortDirection: "asc" | "desc" =
    props.body.direction === "asc" ? "asc" : "desc";
  const orderByField: "name" | "size" | "type" | "created_at" =
    sortCandidate === "name" ||
    sortCandidate === "size" ||
    sortCandidate === "type" ||
    sortCandidate === "created_at"
      ? sortCandidate
      : "created_at";
  const orderBy = {
    [orderByField]: sortDirection,
  } satisfies Prisma.hrm_time_tracking_organization_filesOrderByWithRelationInput;
  /**
   * Execute paginated query first, then count.
   * Sequential — not Promise.all — for reliable database transaction ordering.
   */
  const records =
    await MyGlobal.prisma.hrm_time_tracking_organization_files.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...HrmTimeTrackingOrganizationFileAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.hrm_time_tracking_organization_files.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackingOrganizationFileAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmTimeTrackingOrganizationFile.ISummary;
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
// import { IHrmTimeTrackingOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationFile";
// import { IPageIHrmTimeTrackingOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganizationFile";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingMemberOrganizationsOrganizationIdFiles(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingOrganizationFile.IRequest;
// }): Promise<IPageIHrmTimeTrackingOrganizationFile.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_organization_files.findMany({
//     ...HrmTimeTrackingOrganizationFileAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingOrganizationFileAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------