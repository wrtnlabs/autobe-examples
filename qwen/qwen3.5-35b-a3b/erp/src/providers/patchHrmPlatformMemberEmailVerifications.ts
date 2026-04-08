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
  const status = props.body.status;
  const showDeleted = status === "deleted";
  const nowDate: Date = new Date();
  const whereFilters: Prisma.hrm_platform_member_email_verificationsWhereInput =
    showDeleted ? {} : { deleted_at: null };
  if (props.body.member_id !== undefined) {
    whereFilters.hrm_platform_member_id = props.body.member_id;
  }
  if (status !== undefined && status !== "deleted") {
    const statusConditions: Prisma.hrm_platform_member_email_verificationsWhereInput[] =
      [];
    switch (status) {
      case "pending":
        statusConditions.push(
          { used_at: null },
          { expires_at: { gt: nowDate } },
        );
        break;
      case "verified":
        statusConditions.push({ used_at: { not: null } });
        break;
      case "expired":
        statusConditions.push(
          { expires_at: { lte: nowDate } },
          { used_at: null },
        );
        break;
    }
    if (statusConditions.length > 0) {
      whereFilters.AND = statusConditions;
    }
  }
  if (props.body.created_at_from !== undefined) {
    const createdAtFrom = new Date(props.body.created_at_from);
    if (whereFilters.created_at) {
      const existingCreatedAt =
        whereFilters.created_at as Prisma.DateTimeFilter;
      whereFilters.created_at = {
        gte: createdAtFrom,
        ...existingCreatedAt,
      };
    } else {
      whereFilters.created_at = {
        gte: createdAtFrom,
      };
    }
  }
  if (props.body.created_at_to !== undefined) {
    const createdAtTo = new Date(props.body.created_at_to);
    if (whereFilters.created_at) {
      const existingCreatedAt =
        whereFilters.created_at as Prisma.DateTimeFilter;
      whereFilters.created_at = {
        lte: createdAtTo,
        ...existingCreatedAt,
      };
    } else {
      whereFilters.created_at = {
        lte: createdAtTo,
      };
    }
  }
  if (props.body.expires_at_from !== undefined) {
    const expiresAtFrom = new Date(props.body.expires_at_from);
    if (whereFilters.expires_at) {
      const existingExpiresAt =
        whereFilters.expires_at as Prisma.DateTimeFilter;
      whereFilters.expires_at = {
        gte: expiresAtFrom,
        ...existingExpiresAt,
      };
    } else {
      whereFilters.expires_at = {
        gte: expiresAtFrom,
      };
    }
  }
  if (props.body.expires_at_to !== undefined) {
    const expiresAtTo = new Date(props.body.expires_at_to);
    if (whereFilters.expires_at) {
      const existingExpiresAt =
        whereFilters.expires_at as Prisma.DateTimeFilter;
      whereFilters.expires_at = {
        lte: expiresAtTo,
        ...existingExpiresAt,
      };
    } else {
      whereFilters.expires_at = {
        lte: expiresAtTo,
      };
    }
  }
  const records =
    await MyGlobal.prisma.hrm_platform_member_email_verifications.findMany({
      ...HrmPlatformMemberEmailVerificationAtSummaryTransformer.select(),
      where: whereFilters,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const total =
    await MyGlobal.prisma.hrm_platform_member_email_verifications.count({
      where: whereFilters,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
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