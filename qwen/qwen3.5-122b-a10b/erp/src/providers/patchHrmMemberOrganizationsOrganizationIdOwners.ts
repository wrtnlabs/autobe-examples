import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmOrganizationOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganizationOwner";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmOrganizationOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmOrganizationOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmOrganizationOwnerAtSummaryTransformer } from "../transformers/HrmOrganizationOwnerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberOrganizationsOrganizationIdOwners(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmOrganizationOwner.IRequest;
}): Promise<IPageIHrmOrganizationOwner.ISummary> {
  // Validate organization exists
  await MyGlobal.prisma.hrm_organizations.findUniqueOrThrow({
    where: { id: props.organizationId },
  });
  // Verify member belongs to organization
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build where clause
  const startedAtFilter: Prisma.DateTimeFilter | undefined =
    props.body.started_at_from !== undefined ||
    props.body.started_at_to !== undefined
      ? {
          ...(props.body.started_at_from !== undefined &&
            props.body.started_at_from !== null && {
              gte: props.body.started_at_from,
            }),
          ...(props.body.started_at_to !== undefined &&
            props.body.started_at_to !== null && {
              lte: props.body.started_at_to,
            }),
        }
      : undefined;
  const endedAtFilter: Prisma.DateTimeFilter | undefined =
    props.body.ended_at_from !== undefined ||
    props.body.ended_at_to !== undefined
      ? {
          ...(props.body.ended_at_from !== undefined &&
            props.body.ended_at_from !== null && {
              gte: props.body.ended_at_from,
            }),
          ...(props.body.ended_at_to !== undefined &&
            props.body.ended_at_to !== null && {
              lte: props.body.ended_at_to,
            }),
        }
      : undefined;
  const whereInput: Prisma.hrm_organization_ownersWhereInput = {
    organization_id: props.organizationId,
    deleted_at: null,
    ...(props.body.is_current !== undefined &&
      props.body.is_current !== null && {
        is_current: props.body.is_current,
      }),
    ...(startedAtFilter !== undefined && {
      started_at: startedAtFilter,
    }),
    ...(endedAtFilter !== undefined && {
      OR: [
        {
          ended_at: null,
        },
        {
          ended_at: endedAtFilter,
        },
      ],
    }),
  } satisfies Prisma.hrm_organization_ownersWhereInput;
  // Get paginated records
  const records = await MyGlobal.prisma.hrm_organization_owners.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { started_at: Prisma.SortOrder.desc },
    ...HrmOrganizationOwnerAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.hrm_organization_owners.count({
    where: whereInput,
  });
  // Transform and return
  const data = await ArrayUtil.asyncMap(
    records,
    HrmOrganizationOwnerAtSummaryTransformer.transform,
  );
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data: data,
  } satisfies IPageIHrmOrganizationOwner.ISummary;
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
// import { IHrmOrganizationOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganizationOwner";
// import { IPageIHrmOrganizationOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmOrganizationOwner";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberOrganizationsOrganizationIdOwners(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmOrganizationOwner.IRequest;
// }): Promise<IPageIHrmOrganizationOwner.ISummary> {
//   const records = await MyGlobal.prisma.hrm_organization_owners.findMany({
//     ...HrmOrganizationOwnerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmOrganizationOwnerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------