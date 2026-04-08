import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCommunityReportTransformer } from "../transformers/RedditCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAdminReportsReportIdDismiss(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCommunityReport.IDismissRequest;
}): Promise<IRedditCommunityReport> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const report =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      ...RedditCommunityReportTransformer.select(),
      where: {
        id: props.reportId,
        deleted_at: null,
      },
    });
  if (report.status_id !== 0) {
    throw new HttpException("Report is not in pending status", 400);
  }
  const moderatorRole =
    await MyGlobal.prisma.reddit_community_moderator_roles.findFirst({
      where: {
        reddit_community_member_id: props.admin.id,
        reddit_community_community_id: report.community.id,
        deleted_at: null,
      },
    });
  if (moderatorRole === null) {
    throw new HttpException("You are not a moderator of this community", 403);
  }
  await MyGlobal.prisma.reddit_community_report_resolutions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_community_report_id: report.id,
      reddit_community_admin_id: props.admin.id,
      resolution_type: "dismissed" as const,
      status: "dismissed" as const,
      resolved_at: now,
      resolution_notes: props.body.resolution_notes ?? null,
      created_at: now,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.reddit_community_reports.update({
    where: {
      id: props.reportId,
    },
    data: {
      status_id: 2,
      updated_at: now,
    },
  });
  const finalReport =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      ...RedditCommunityReportTransformer.select(),
      where: {
        id: props.reportId,
      },
    });
  return await RedditCommunityReportTransformer.transform(finalReport);
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
// import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
// import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCommunityAdminReportsReportIdDismiss(props: {
//   admin: AdminPayload;
//   reportId: string & tags.Format<"uuid">;
//   body: IRedditCommunityReport.IDismissRequest;
// }): Promise<IRedditCommunityReport> {
//   const record = await MyGlobal.prisma.reddit_community_reports.findFirstOrThrow({
//     ...RedditCommunityReportTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCommunityReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------