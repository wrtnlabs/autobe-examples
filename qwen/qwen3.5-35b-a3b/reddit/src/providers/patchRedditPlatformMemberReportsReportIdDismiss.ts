import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformReportTransformer } from "../transformers/RedditPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberReportsReportIdDismiss(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformReport> {
  // Step 1: Fetch report with only fields needed for validation
  const validationRecord =
    await MyGlobal.prisma.reddit_platform_reports.findUniqueOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        community: { select: { id: true } },
      },
    });
  // Step 2: Verify report is in pending status
  if (validationRecord.status !== "pending") {
    throw new HttpException("Report has already been processed", 422);
  }
  // Step 3: Verify user is moderator of the report's community
  const communityMember =
    await MyGlobal.prisma.reddit_platform_community_members.findFirst({
      where: {
        community: { id: validationRecord.community.id },
        user: { id: props.member.id },
        role: "moderator",
        deleted_at: null,
      },
    });
  if (!communityMember) {
    throw new HttpException("You are not a moderator of this community", 403);
  }
  // Step 4: Update report with dismissed status
  const updated = await MyGlobal.prisma.reddit_platform_reports.update({
    where: {
      id: props.reportId,
    },
    data: {
      status: "dismissed",
      reviewed_by: props.member.session_id,
      reviewed_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Step 5: Fetch updated record with full transformer select
  const finalRecord =
    await MyGlobal.prisma.reddit_platform_reports.findUniqueOrThrow({
      ...RedditPlatformReportTransformer.select(),
      where: {
        id: props.reportId,
      },
    });
  return await RedditPlatformReportTransformer.transform(finalRecord);
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
// import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
// import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberReportsReportIdDismiss(props: {
//   member: MemberPayload;
//   reportId: string & tags.Format<"uuid">;
// }): Promise<IRedditPlatformReport> {
//   const record = await MyGlobal.prisma.reddit_platform_reports.findFirstOrThrow({
//     ...RedditPlatformReportTransformer.select(),
//     where: { ... },
//   });
//   return await RedditPlatformReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------