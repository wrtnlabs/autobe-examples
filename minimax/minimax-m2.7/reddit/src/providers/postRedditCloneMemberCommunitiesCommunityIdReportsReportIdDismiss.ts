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

export async function postRedditCloneMemberCommunitiesCommunityIdReportsReportIdDismiss(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunityReport.IDismiss;
}): Promise<IRedditCloneCommunityReport> {
  // 1. Authorization: Verify member is moderator or owner of the community
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findUnique({
      where: {
        reddit_clone_community_id_reddit_clone_member_id: {
          reddit_clone_community_id: props.communityId,
          reddit_clone_member_id: props.member.id,
        },
      },
      select: {
        id: true,
        role: true,
      },
    });
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Report validation: Verify report exists and belongs to the community
  const report = await MyGlobal.prisma.reddit_clone_reports.findUnique({
    where: {
      id: props.reportId,
    },
    select: {
      id: true,
      status: true,
      reddit_clone_community_id: true,
    },
  });
  if (!report || report.reddit_clone_community_id !== props.communityId) {
    throw new HttpException("Not Found", 404);
  }
  // 3. Status transition check: Only pending reports can be dismissed
  if (report.status !== "pending") {
    throw new HttpException(
      report.status === "approved"
        ? "Report has already been approved"
        : "Report has already been dismissed",
      400,
    );
  }
  // 4. Update report to dismissed status
  await MyGlobal.prisma.reddit_clone_reports.update({
    where: { id: props.reportId },
    data: {
      status: "dismissed",
      updated_at: new Date(),
    },
  });
  // 5. Return updated report using transformer
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
// export async function postRedditCloneMemberCommunitiesCommunityIdReportsReportIdDismiss(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   reportId: string & tags.Format<"uuid">;
//   body: IRedditCloneCommunityReport.IDismiss;
// }): Promise<IRedditCloneCommunityReport> {
//   const record = await MyGlobal.prisma.reddit_clone_reports.findFirstOrThrow({
//     ...RedditCloneCommunityReportTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCloneCommunityReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------