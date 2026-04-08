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

export async function getRedditPlatformMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformReport> {
  const record =
    await MyGlobal.prisma.reddit_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        community_id: true,
        ...RedditPlatformReportTransformer.select().select,
      },
    });
  if (record.deleted_at !== null) {
    throw new HttpException("Report not found", 404);
  }
  const membership =
    await MyGlobal.prisma.reddit_platform_community_members.findFirst({
      where: {
        community_id: record.community_id,
        user_id: props.member.id,
        role: "moderator",
      },
    });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await RedditPlatformReportTransformer.transform(record);
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
// export async function getRedditPlatformMemberReportsReportId(props: {
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