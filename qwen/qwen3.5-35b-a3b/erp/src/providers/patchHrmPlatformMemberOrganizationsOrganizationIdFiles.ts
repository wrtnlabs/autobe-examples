import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationFile";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganizationFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformOrganizationFileAtSummaryTransformer } from "../transformers/HrmPlatformOrganizationFileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberOrganizationsOrganizationIdFiles(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmPlatformOrganizationFile.IRequest;
}): Promise<IPageIHrmPlatformOrganizationFile.ISummary> {
  // Verify organization exists
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUnique({
      where: { id: props.organizationId },
      select: {
        id: true,
        name: true,
      },
    });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // Verify user belongs to organization via join table
  const membership = await MyGlobal.prisma.hrm_platform_organizations.findFirst(
    {
      where: {
        id: props.organizationId,
      },
    },
  );
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Extract pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const safeLimit = limit > 100 ? 100 : limit < 1 ? 1 : limit;
  const skip = (page - 1) * safeLimit;
  // Build where clause with organization filter
  const where: Prisma.hrm_platform_organization_filesWhereInput = {
    hrm_platform_organization_id: props.organizationId,
  };
  // Add optional filters
  if (props.body.file_type !== undefined && props.body.file_type.length > 0) {
    where.file_type = { in: props.body.file_type };
  }
  if (props.body.status !== undefined && props.body.status.length > 0) {
    where.status = { in: props.body.status };
  }
  if (props.body.file_name !== undefined && props.body.file_name.length > 0) {
    where.file_name = { contains: props.body.file_name, mode: "insensitive" };
  }
  if (props.body.created_at_range !== undefined) {
    const startDate = new Date(props.body.created_at_range.start);
    const endDate = new Date(props.body.created_at_range.end);
    where.created_at = {
      gte: startDate,
      lte: endDate,
    };
  }
  if (props.body.file_size_range !== undefined) {
    where.file_size = {
      gte: props.body.file_size_range.min,
      lte: props.body.file_size_range.max,
    };
  }
  // Build orderBy clause
  const sortOrder: Prisma.SortOrder = props.body.sort_order ?? "desc";
  const orderBy: Prisma.hrm_platform_organization_filesOrderByWithRelationInput =
    (
      props.body.sort_by === "created_at"
        ? { created_at: sortOrder }
        : props.body.sort_by === "updated_at"
          ? { updated_at: sortOrder }
          : props.body.sort_by === "file_name"
            ? { file_name: sortOrder }
            : props.body.sort_by === "file_size"
              ? { file_size: sortOrder }
              : props.body.sort_by === "status"
                ? { status: sortOrder }
                : { created_at: sortOrder }
    ) satisfies Prisma.hrm_platform_organization_filesOrderByWithRelationInput;
  // Query files with transformer
  const [records, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_organization_files.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy,
      ...HrmPlatformOrganizationFileAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_platform_organization_files.count({ where }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    records,
    HrmPlatformOrganizationFileAtSummaryTransformer.transform,
  );
  // Calculate pagination
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);
  return {
    pagination: {
      current: page,
      limit: safeLimit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIHrmPlatformOrganizationFile.ISummary;
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
// import { IHrmPlatformOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationFile";
// import { IPageIHrmPlatformOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganizationFile";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberOrganizationsOrganizationIdFiles(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmPlatformOrganizationFile.IRequest;
// }): Promise<IPageIHrmPlatformOrganizationFile.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_organization_files.findMany({
//     ...HrmPlatformOrganizationFileAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformOrganizationFileAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------