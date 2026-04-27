import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingInvitationAtSummaryTransformer } from "../transformers/HrmTimeTrackingInvitationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberInvitations(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingInvitation.IRequest;
}): Promise<IPageIHrmTimeTrackingInvitation.ISummary> {
  // 1. Find active employee with employee:manage permission
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      deleted_at: null,
      status: "active",
      role: {
        rolePermissions: {
          some: {
            permission_code: "employee:manage",
            deleted_at: null,
          },
        },
      },
    },
    select: { hrm_time_tracking_organization_id: true },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 3. Build where clause — scoped to employee's organization
  const where: Prisma.hrm_time_tracking_invitationsWhereInput = {
    hrm_time_tracking_organization_id:
      employee.hrm_time_tracking_organization_id,
    deleted_at: null,
  };
  const body = props.body;
  if (body.search !== undefined) {
    where.OR = [
      { email: { contains: body.search, mode: "insensitive" } },
      { status: { contains: body.search, mode: "insensitive" } },
    ];
  }
  if (body.status !== undefined) {
    where.status = Array.isArray(body.status)
      ? { in: body.status }
      : body.status;
  }
  if (body.email !== undefined) {
    where.email = { contains: body.email, mode: "insensitive" };
  }
  if (body.inviterId !== undefined) {
    where.hrm_time_tracking_member_inviter_id = body.inviterId;
  }
  if (body.roleId !== undefined) {
    where.hrm_time_tracking_role_id = body.roleId;
  }
  if (body.dateRange?.createdAt !== undefined) {
    where.created_at = {};
    if (body.dateRange.createdAt.start !== undefined) {
      where.created_at.gte = body.dateRange.createdAt.start;
    }
    if (body.dateRange.createdAt.end !== undefined) {
      where.created_at.lte = body.dateRange.createdAt.end;
    }
  }
  if (body.dateRange?.expiredAt !== undefined) {
    where.expired_at = {};
    if (body.dateRange.expiredAt.start !== undefined) {
      where.expired_at.gte = body.dateRange.expiredAt.start;
    }
    if (body.dateRange.expiredAt.end !== undefined) {
      where.expired_at.lte = body.dateRange.expiredAt.end;
    }
  }
  if (body.dateRange?.acceptedAt !== undefined) {
    where.accepted_at = {};
    if (body.dateRange.acceptedAt.start !== undefined) {
      where.accepted_at.gte = body.dateRange.acceptedAt.start;
    }
    if (body.dateRange.acceptedAt.end !== undefined) {
      where.accepted_at.lte = body.dateRange.acceptedAt.end;
    }
  }
  // 4. Build orderBy
  let orderBy: Prisma.hrm_time_tracking_invitationsOrderByWithRelationInput;
  if (body.sort === "email") {
    orderBy = { email: "asc" };
  } else if (body.sort === "status") {
    orderBy = { status: "asc" };
  } else {
    orderBy = { created_at: "desc" };
  }
  // 5. Execute queries — sequential (count after findMany)
  const records = await MyGlobal.prisma.hrm_time_tracking_invitations.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...HrmTimeTrackingInvitationAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_tracking_invitations.count({
    where,
  });
  // 6. Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackingInvitationAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmTimeTrackingInvitation.ISummary;
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
// import { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
// import { IPageIHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingInvitation";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingMemberInvitations(props: {
//   member: MemberPayload;
//   body: IHrmTimeTrackingInvitation.IRequest;
// }): Promise<IPageIHrmTimeTrackingInvitation.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_invitations.findMany({
//     ...HrmTimeTrackingInvitationAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingInvitationAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------