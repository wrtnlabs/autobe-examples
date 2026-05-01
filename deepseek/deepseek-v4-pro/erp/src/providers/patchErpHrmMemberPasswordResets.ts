import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmMemberPasswordResetAtSummaryTransformer } from "../transformers/ErpHrmMemberPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberPasswordResets(props: {
  member: MemberPayload;
  body: IErpHrmMemberPasswordReset.IRequest;
}): Promise<IPageIErpHrmMemberPasswordReset.ISummary> {
  const body = props.body;
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization selected", 400);
  }
  const organizationId = session.erp_hrm_organization_id;
  const whereConditions: Prisma.erp_hrm_member_password_resetsWhereInput[] = [
    {
      member: {
        deleted_at: null,
        employees: {
          some: {
            erp_hrm_organization_id: organizationId,
            deleted_at: null,
          },
        },
      },
    },
  ];
  if (body.memberId !== undefined) {
    whereConditions.push({ erp_hrm_member_id: body.memberId });
  }
  const now = new Date();
  if (body.status === "active") {
    whereConditions.push({ expired_at: { gt: now } });
  } else if (body.status === "expired") {
    whereConditions.push({ expired_at: { lte: now } });
  }
  if (body.createdFrom !== undefined) {
    whereConditions.push({ created_at: { gte: new Date(body.createdFrom) } });
  }
  if (body.createdTo !== undefined) {
    whereConditions.push({ created_at: { lte: new Date(body.createdTo) } });
  }
  if (body.search !== undefined) {
    whereConditions.push({
      member: {
        OR: [
          { display_name: { contains: body.search, mode: "insensitive" } },
          { email: { contains: body.search, mode: "insensitive" } },
        ],
      },
    });
  }
  const baseWhere: Prisma.erp_hrm_member_password_resetsWhereInput = {
    AND: whereConditions,
  };
  const sort = body.sort ?? "created_at_desc";
  const orderByInput: Prisma.erp_hrm_member_password_resetsOrderByWithRelationInput =
    sort === "created_at_asc"
      ? { created_at: "asc" }
      : sort === "expired_at_asc"
        ? { expired_at: "asc" }
        : sort === "expired_at_desc"
          ? { expired_at: "desc" }
          : { created_at: "desc" };
  const limit = body.limit ?? 20;
  const page = (body.page ?? 1) || 1;
  const isCursorPagination =
    body.cursor !== undefined &&
    (body.page === null || body.page === undefined);
  const queryWhere: Prisma.erp_hrm_member_password_resetsWhereInput =
    isCursorPagination
      ? {
          AND: [
            ...whereConditions,
            {
              created_at:
                sort === "created_at_asc" || sort === "expired_at_asc"
                  ? { gt: new Date(body.cursor!) }
                  : { lt: new Date(body.cursor!) },
            },
          ],
        }
      : baseWhere;
  const skip = isCursorPagination ? 0 : (page - 1) * limit;
  const data = await MyGlobal.prisma.erp_hrm_member_password_resets.findMany({
    where: queryWhere,
    ...ErpHrmMemberPasswordResetAtSummaryTransformer.select(),
    orderBy: orderByInput,
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.erp_hrm_member_password_resets.count({
    where: baseWhere,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmMemberPasswordResetAtSummaryTransformer.transform,
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
// import { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
// import { IPageIErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberPasswordReset";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMemberPasswordResets(props: {
//   member: MemberPayload;
//   body: IErpHrmMemberPasswordReset.IRequest;
// }): Promise<IPageIErpHrmMemberPasswordReset.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_member_password_resets.findMany({
//     ...ErpHrmMemberPasswordResetAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmMemberPasswordResetAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------