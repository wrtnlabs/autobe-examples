import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberPasswordReset";
import { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformMemberPasswordResetAtSummaryTransformer } from "../transformers/RedditPlatformMemberPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberPasswordResets(props: {
  member: MemberPayload;
  body: IRedditPlatformMemberPasswordReset.IRequest;
}): Promise<IPageIRedditPlatformMemberPasswordReset.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const baseWhere: Prisma.reddit_platform_member_password_resetsWhereInput = {
    member_id: props.member.id,
    deleted_at: null,
  };
  const where: Prisma.reddit_platform_member_password_resetsWhereInput = {
    ...baseWhere,
  };
  // Apply status filter
  if (props.body.status !== undefined) {
    const status = props.body.status;
    if (status === "active") {
      where.expires_at = { gt: new Date() };
      where.used_at = null;
    } else if (status === "expired") {
      where.expires_at = { lte: new Date() };
    } else if (status === "used") {
      where.used_at = { not: null };
    }
  }
  // Apply date range filters
  const dateConditions: Prisma.DateTimeFilter = {};
  if (props.body.createdAfter !== undefined) {
    dateConditions.gte = props.body.createdAfter;
  }
  if (props.body.createdBefore !== undefined) {
    dateConditions.lte = props.body.createdBefore;
  }
  if (Object.keys(dateConditions).length > 0) {
    where.created_at = dateConditions;
  }
  // Query records
  const records =
    await MyGlobal.prisma.reddit_platform_member_password_resets.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      ...RedditPlatformMemberPasswordResetAtSummaryTransformer.select(),
    });
  // Query total count
  const total =
    await MyGlobal.prisma.reddit_platform_member_password_resets.count({
      where,
    });
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    RedditPlatformMemberPasswordResetAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
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
// import { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
// import { IPageIRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberPasswordReset";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberPasswordResets(props: {
//   member: MemberPayload;
//   body: IRedditPlatformMemberPasswordReset.IRequest;
// }): Promise<IPageIRedditPlatformMemberPasswordReset.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_member_password_resets.findMany({
//     ...RedditPlatformMemberPasswordResetAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformMemberPasswordResetAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------