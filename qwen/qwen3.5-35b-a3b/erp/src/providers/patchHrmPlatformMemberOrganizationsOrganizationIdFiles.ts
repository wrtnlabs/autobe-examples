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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const validatedLimit = Math.min(Math.max(limit, 1), 100);
  const skip = (page - 1) * validatedLimit;
  await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
    where: { id: props.organizationId, deleted_at: null },
  });
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_member_id: props.member.id,
        hrm_platform_organization_id: props.organizationId,
        deleted_at: null,
      },
    },
  );
  if (memberEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  const whereInput: Prisma.hrm_platform_organization_filesWhereInput = {
    hrm_platform_organization_id: props.organizationId,
    deleted_at: null,
  };
  if (props.body.file_type !== undefined && props.body.file_type.length > 0) {
    whereInput.file_type = { in: props.body.file_type };
  }
  if (props.body.status !== undefined && props.body.status.length > 0) {
    whereInput.status = { in: props.body.status };
  }
  if (props.body.created_at_range !== undefined) {
    whereInput.created_at = {
      gte: props.body.created_at_range.start,
      lte: props.body.created_at_range.end,
    };
  }
  if (props.body.file_size_range !== undefined) {
    whereInput.file_size = {
      gte: props.body.file_size_range.min,
      lte: props.body.file_size_range.max,
    };
  }
  if (props.body.file_name !== undefined) {
    whereInput.file_name = { contains: props.body.file_name.toLowerCase() };
  }
  const orderByInput: Prisma.hrm_platform_organization_filesOrderByWithRelationInput =
    {
      [props.body.sort_by ?? "created_at"]: props.body.sort_order ?? "desc",
    } satisfies Prisma.hrm_platform_organization_filesOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_organization_files.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: validatedLimit,
      ...HrmPlatformOrganizationFileAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_platform_organization_files.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: validatedLimit,
      records: total,
      pages: Math.ceil(total / validatedLimit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformOrganizationFileAtSummaryTransformer.transform,
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