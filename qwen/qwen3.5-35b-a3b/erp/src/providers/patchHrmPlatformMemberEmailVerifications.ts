import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformMemberEmailVerificationAtSummaryTransformer } from "../transformers/HrmPlatformMemberEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IHrmPlatformMemberEmailVerification.IRequest;
}): Promise<IPageIHrmPlatformMemberEmailVerification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findUnique(
    {
      where: { id: props.member.session_id },
    },
  );
  if (session === null) {
    throw new HttpException("Session not found", 404);
  }
  const isAdmin = session.organization_id === null;
  const organizationId = isAdmin ? undefined : session.organization_id;
  const whereConditions: Prisma.hrm_platform_member_email_verificationsWhereInput =
    {};
  if (props.body.member_id !== undefined) {
    whereConditions.hrm_platform_member_id = props.body.member_id;
    if (!isAdmin) {
      const requestedMember =
        await MyGlobal.prisma.hrm_platform_members.findUnique({
          where: { id: props.body.member_id },
        });
      if (requestedMember === null) {
        throw new HttpException("Member not found", 404);
      }
    }
  }
  if (props.body.status !== undefined) {
    const status = props.body.status;
    const now = new Date();
    if (status === "pending") {
      whereConditions.used_at = null;
      whereConditions.expires_at = { gt: now };
    } else if (status === "verified") {
      whereConditions.used_at = { not: null };
    } else if (status === "expired") {
      whereConditions.expires_at = { lte: now };
      whereConditions.used_at = null;
    } else if (status === "deleted") {
      whereConditions.deleted_at = { not: null };
    }
  }
  if (props.body.created_at_from !== undefined) {
    whereConditions.created_at = {
      gte: new Date(props.body.created_at_from),
    };
  }
  if (props.body.created_at_to !== undefined) {
    const existing = whereConditions.created_at as
      | Prisma.DateTimeFilter
      | undefined;
    whereConditions.created_at =
      existing !== undefined
        ? { ...existing, lte: new Date(props.body.created_at_to) }
        : { lte: new Date(props.body.created_at_to) };
  }
  if (props.body.expires_at_from !== undefined) {
    const existing = whereConditions.expires_at as
      | Prisma.DateTimeFilter
      | undefined;
    whereConditions.expires_at =
      existing !== undefined
        ? { ...existing, gte: new Date(props.body.expires_at_from) }
        : { gte: new Date(props.body.expires_at_from) };
  }
  if (props.body.expires_at_to !== undefined) {
    const existing = whereConditions.expires_at as
      | Prisma.DateTimeFilter
      | undefined;
    whereConditions.expires_at =
      existing !== undefined
        ? { ...existing, lte: new Date(props.body.expires_at_to) }
        : { lte: new Date(props.body.expires_at_to) };
  }
  const records =
    await MyGlobal.prisma.hrm_platform_member_email_verifications.findMany({
      where: whereConditions,
      ...HrmPlatformMemberEmailVerificationAtSummaryTransformer.select(),
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });
  const total =
    await MyGlobal.prisma.hrm_platform_member_email_verifications.count({
      where: whereConditions,
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
      HrmPlatformMemberEmailVerificationAtSummaryTransformer.transform,
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
// import { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
// import { IPageIHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberEmailVerification";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberEmailVerifications(props: {
//   member: MemberPayload;
//   body: IHrmPlatformMemberEmailVerification.IRequest;
// }): Promise<IPageIHrmPlatformMemberEmailVerification.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_member_email_verifications.findMany({
//     ...HrmPlatformMemberEmailVerificationAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformMemberEmailVerificationAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------