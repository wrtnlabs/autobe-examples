import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityReport";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityReportTransformer } from "../transformers/RedditCloneCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommunitiesCommunityIdReportsReportIdApprove(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneCommunityReport> {
  // Step 1: Authorization - verify member is moderator of the community
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_member_id: props.member.id,
        role: { in: ["owner", "moderator"] },
      },
    });
  if (!moderator) {
    throw new HttpException("You are not a moderator of this community", 403);
  }
  // Step 2: Report lookup - verify report exists and belongs to community
  const report = await MyGlobal.prisma.reddit_clone_reports.findFirst({
    where: {
      id: props.reportId,
      reddit_clone_community_id: props.communityId,
    },
    ...RedditCloneCommunityReportTransformer.select(),
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  // Step 3: Idempotent - if already approved or dismissed, return success
  if (report.status !== "pending") {
    return await RedditCloneCommunityReportTransformer.transform(report);
  }
  // Step 4: Content deletion - soft delete based on target_type
  const now = new Date();
  if (report.target_type === "post") {
    await MyGlobal.prisma.reddit_clone_posts.update({
      where: { id: report.target_id },
      data: { deleted_at: now },
    });
  } else if (report.target_type === "comment") {
    await MyGlobal.prisma.reddit_clone_comments.update({
      where: { id: report.target_id },
      data: { deleted_at: now },
    });
  }
  // Step 5: Report update - set status to approved
  const updatedReport = await MyGlobal.prisma.reddit_clone_reports.update({
    where: { id: props.reportId },
    data: {
      status: "approved",
      updated_at: now,
    },
    ...RedditCloneCommunityReportTransformer.select(),
  });
  // Step 6: Response
  return await RedditCloneCommunityReportTransformer.transform(updatedReport);
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
// import { IRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityReport";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCloneMemberCommunitiesCommunityIdReportsReportIdApprove(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   reportId: string & tags.Format<"uuid">;
// }): Promise<IRedditCloneCommunityReport> {
//   const record = await MyGlobal.prisma.reddit_clone_reports.findFirstOrThrow({
//     ...RedditCloneCommunityReportTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCloneCommunityReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------