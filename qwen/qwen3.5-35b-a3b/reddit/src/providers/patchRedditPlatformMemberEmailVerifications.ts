import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberEmailVerification";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformMemberEmailVerificationAtSummaryTransformer } from "../transformers/RedditPlatformMemberEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IRedditPlatformMemberEmailVerification.IRequest;
}): Promise<IPageIRedditPlatformMemberEmailVerification.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  const direction: "ASC" | "DESC" = props.body.direction ?? "ASC";
  const sort: "created_at" | "expires_at" | "email" | "id" =
    props.body.sort ?? "created_at";
  const status: "active" | "expired" | "all" = props.body.status ?? "active";
  const nowTime: string = new Date().toISOString();
  const statusFilter: Prisma.reddit_platform_member_email_verificationsWhereInput =
    status === "active"
      ? { deleted_at: null }
      : status === "expired"
        ? { expires_at: { lt: nowTime } }
        : {};
  const emailFilter: Prisma.reddit_platform_member_email_verificationsWhereInput =
    props.body.email !== undefined
      ? { email: { startsWith: props.body.email } }
      : {};
  const memberFilter: Prisma.reddit_platform_member_email_verificationsWhereInput =
    props.body.member_id !== undefined
      ? { reddit_platform_member_id: props.body.member_id }
      : {};
  const createdAtFilter: Prisma.reddit_platform_member_email_verificationsWhereInput =
    props.body.created_at_range !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_range.gte !== undefined && {
              gte: props.body.created_at_range.gte,
            }),
            ...(props.body.created_at_range.lte !== undefined && {
              lte: props.body.created_at_range.lte,
            }),
          },
        }
      : {};
  const expiresAtFilter: Prisma.reddit_platform_member_email_verificationsWhereInput =
    props.body.expires_at_range !== undefined
      ? {
          expires_at: {
            ...(props.body.expires_at_range.gte !== undefined && {
              gte: props.body.expires_at_range.gte,
            }),
            ...(props.body.expires_at_range.lte !== undefined && {
              lte: props.body.expires_at_range.lte,
            }),
          },
        }
      : {};
  const whereInput: Prisma.reddit_platform_member_email_verificationsWhereInput =
    {
      ...statusFilter,
      ...emailFilter,
      ...memberFilter,
      ...createdAtFilter,
      ...expiresAtFilter,
    } satisfies Prisma.reddit_platform_member_email_verificationsWhereInput;
  const orderByInput: Prisma.SortOrder = direction === "ASC" ? "asc" : "desc";
  const records =
    await MyGlobal.prisma.reddit_platform_member_email_verifications.findMany({
      where: whereInput,
      orderBy: {
        [sort]: orderByInput,
      },
      skip,
      take: limit,
      ...RedditPlatformMemberEmailVerificationAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.reddit_platform_member_email_verifications.count({
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
      RedditPlatformMemberEmailVerificationAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditPlatformMemberEmailVerification.ISummary;
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
// import { IRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberEmailVerification";
// import { IPageIRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberEmailVerification";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberEmailVerifications(props: {
//   member: MemberPayload;
//   body: IRedditPlatformMemberEmailVerification.IRequest;
// }): Promise<IPageIRedditPlatformMemberEmailVerification.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_member_email_verifications.findMany({
//     ...RedditPlatformMemberEmailVerificationAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformMemberEmailVerificationAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------