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

export async function putRedditCloneMemberCommunitiesCommunityIdReportsReportId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunityReport.IUpdate;
}): Promise<IRedditCloneCommunityReport> {
  // Step 1: Validate member has moderator privileges for the community
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_member_id: props.member.id,
        role: { in: ["owner", "moderator"] },
      },
      select: { id: true },
    });
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Verify report exists and belongs to the specified community
  const report = await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      id: true,
      reddit_clone_community_id: true,
      status: true,
      target_type: true,
      target_id: true,
    },
  });
  // Verify report belongs to the specified community
  if (report.reddit_clone_community_id !== props.communityId) {
    throw new HttpException("Report not found in this community", 404);
  }
  // Step 3: Ensure report status is currently 'pending'
  if (report.status !== "pending") {
    throw new HttpException("Only pending reports can be updated", 400);
  }
  // Step 4: Update the report status (only status and updated_at exist in schema)
  const now = new Date();
  await MyGlobal.prisma.reddit_clone_reports.update({
    where: { id: props.reportId },
    data: {
      status: props.body.status,
      updated_at: now,
    },
  });
  // Step 5: If approved, delete the reported content (cascade handles child records)
  if (props.body.status === "approved") {
    if (report.target_type === "post") {
      await MyGlobal.prisma.reddit_clone_posts.delete({
        where: { id: report.target_id },
      });
    } else if (report.target_type === "comment") {
      await MyGlobal.prisma.reddit_clone_comments.delete({
        where: { id: report.target_id },
      });
    }
  }
  // Step 6: Fetch and return the updated report
  const updated = await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    ...RedditCloneCommunityReportTransformer.select(),
  });
  return await RedditCloneCommunityReportTransformer.transform(updated);
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
// export async function putRedditCloneMemberCommunitiesCommunityIdReportsReportId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   reportId: string & tags.Format<"uuid">;
//   body: IRedditCloneCommunityReport.IUpdate;
// }): Promise<IRedditCloneCommunityReport> {
//   await MyGlobal.prisma.reddit_clone_reports.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
//     where: { ... },
//     ...RedditCloneCommunityReportTransformer.select(),
//   });
//   return await RedditCloneCommunityReportTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------