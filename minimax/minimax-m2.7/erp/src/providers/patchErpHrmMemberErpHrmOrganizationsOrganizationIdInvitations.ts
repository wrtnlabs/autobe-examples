import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmInvitationAtSummaryTransformer } from "../transformers/ErpHrmInvitationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberErpHrmOrganizationsOrganizationIdInvitations(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmInvitation.IRequest;
}): Promise<IPageIErpHrmInvitation.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    erp_hrm_organization_id: props.organizationId,
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" as const },
    }),
    ...(props.body.createdAtStart && {
      created_at: { gte: new Date(props.body.createdAtStart) },
    }),
    ...(props.body.createdAtEnd && {
      created_at: { lte: new Date(props.body.createdAtEnd) },
    }),
    ...(props.body.erpHrmRoleId && {
      erp_hrm_role_id: props.body.erpHrmRoleId,
    }),
    ...(props.body.erpHrmDepartmentId && {
      erp_hrm_department_id: props.body.erpHrmDepartmentId,
    }),
  } satisfies Prisma.erp_hrm_invitationsWhereInput;
  const orderByInput = (
    props.body.orderBy === "email"
      ? ({ email: props.body.sort ?? "asc" } as const)
      : props.body.orderBy === "status"
        ? ({ status: props.body.sort ?? "asc" } as const)
        : ({ created_at: props.body.sort ?? "desc" } as const)
  ) satisfies Prisma.erp_hrm_invitationsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.erp_hrm_invitations.findMany({
    where: whereInput,
    skip: skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmInvitationAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_invitations.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ErpHrmInvitationAtSummaryTransformer.transform,
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
// import { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
// import { IPageIErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmInvitation";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMemberErpHrmOrganizationsOrganizationIdInvitations(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IErpHrmInvitation.IRequest;
// }): Promise<IPageIErpHrmInvitation.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_invitations.findMany({
//     ...ErpHrmInvitationAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmInvitationAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------