import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityAdminPasswordReset";
import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { IRedditCommunityAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityAdminPasswordResetAtSummaryTransformer } from "../transformers/RedditCommunityAdminPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberPasswordResets(props: {
  member: MemberPayload;
  body: IRedditCommunityAdminPasswordReset.IRequest;
}): Promise<IPageIRedditCommunityAdminPasswordReset.ISummary> {
  const limit =
    props.body.limit !== undefined && props.body.limit !== null
      ? Math.min(Math.max(props.body.limit, 1), 100)
      : 20;
  const page =
    props.body.page !== undefined &&
    props.body.page !== null &&
    props.body.page > 0
      ? props.body.page
      : 1;
  const skip = (page - 1) * limit;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const nowDate = new Date(now);
  // Build base filters
  const emailFilter =
    props.body.email !== undefined && props.body.email !== null
      ? { email: { contains: props.body.email } }
      : {};
  const dateFilters = {
    ...(props.body.createdAtStart !== undefined &&
    props.body.createdAtStart !== null
      ? { created_at: { gte: new Date(props.body.createdAtStart) } }
      : {}),
    ...(props.body.createdAtEnd !== undefined &&
    props.body.createdAtEnd !== null
      ? { created_at: { lte: new Date(props.body.createdAtEnd) } }
      : {}),
    ...(props.body.expiresAtStart !== undefined &&
    props.body.expiresAtStart !== null
      ? { expires_at: { gte: new Date(props.body.expiresAtStart) } }
      : {}),
    ...(props.body.expiresAtEnd !== undefined &&
    props.body.expiresAtEnd !== null
      ? { expires_at: { lte: new Date(props.body.expiresAtEnd) } }
      : {}),
    ...(props.body.usedAtStart !== undefined && props.body.usedAtStart !== null
      ? { used_at: { not: null, gte: new Date(props.body.usedAtStart) } }
      : {}),
    ...(props.body.usedAtEnd !== undefined && props.body.usedAtEnd !== null
      ? { used_at: { not: null, lte: new Date(props.body.usedAtEnd) } }
      : {}),
  };
  // Build status filter
  let statusFilter: Prisma.reddit_community_admin_password_resetsWhereInput &
    Prisma.reddit_community_member_password_resetsWhereInput;
  switch (props.body.status) {
    case "used":
      statusFilter = { used_at: { not: null } };
      break;
    case "expired":
      statusFilter = { expires_at: { lte: nowDate } };
      break;
    case "active":
    default:
      statusFilter = { used_at: null, expires_at: { gt: nowDate } };
  }
  const adminWhere: Prisma.reddit_community_admin_password_resetsWhereInput = {
    ...emailFilter,
    ...dateFilters,
    ...statusFilter,
  };
  const memberWhere: Prisma.reddit_community_member_password_resetsWhereInput =
    {
      ...emailFilter,
      ...dateFilters,
      ...statusFilter,
    };
  // Query admin password resets
  const [adminRecords, adminTotal] = await Promise.all([
    MyGlobal.prisma.reddit_community_admin_password_resets.findMany({
      where: adminWhere,
      ...RedditCommunityAdminPasswordResetAtSummaryTransformer.select(),
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_admin_password_resets.count({
      where: adminWhere,
    }),
  ]);
  // Query member password resets
  const memberRecords =
    await MyGlobal.prisma.reddit_community_member_password_resets.findMany({
      where: memberWhere,
      select: {
        id: true,
        email: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });
  // Calculate total
  const memberTotal =
    await MyGlobal.prisma.reddit_community_member_password_resets.count({
      where: memberWhere,
    });
  const totalRecords = adminTotal + memberTotal;
  // Map records to unified format
  const adminMapped = await ArrayUtil.asyncMap(
    adminRecords,
    RedditCommunityAdminPasswordResetAtSummaryTransformer.transform,
  );
  const memberMapped = memberRecords.map((record) => ({
    id: record.id,
    email: record.email,
    expiresAt: toISOStringSafe(record.expires_at),
    usedAt: null,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: toISOStringSafe(record.updated_at),
    admin: null as IRedditCommunityAdmin.ISummary | null,
  })) as Array<IRedditCommunityAdminPasswordReset.ISummary>;
  const data = [...adminMapped, ...memberMapped];
  return {
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
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
// import { IRedditCommunityAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminPasswordReset";
// import { IPageIRedditCommunityAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityAdminPasswordReset";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityMemberPasswordResets(props: {
//   member: MemberPayload;
//   body: IRedditCommunityAdminPasswordReset.IRequest;
// }): Promise<IPageIRedditCommunityAdminPasswordReset.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_admin_password_resets.findMany({
//     ...RedditCommunityAdminPasswordResetAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityAdminPasswordResetAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------