import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
import { IREdditLikeCommunityReportOnPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { REdditLikeCommunityReportTransformer } from "../transformers/REdditLikeCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeCommunityMemberReportsReportIdReportOnPostsReportOnPostId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  reportOnPostId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityReport.IUpdate;
}): Promise<IREdditLikeCommunityReport> {
  const report =
    await MyGlobal.prisma.reddit_like_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        reddit_like_community_community_id: true,
        status: true,
        target_type: true,
      },
    });
  const moderatorRecord =
    await MyGlobal.prisma.reddit_like_community_community_moderators.findFirst({
      where: {
        reddit_like_community_community_id:
          report.reddit_like_community_community_id,
        reddit_like_community_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (moderatorRecord === null) {
    throw new HttpException(
      "You do not have moderator authority in this community",
      403,
    );
  }
  if (report.status !== "pending" || report.target_type !== "post") {
    throw new HttpException(
      "This report cannot be resolved through this endpoint",
      400,
    );
  }
  const reportOnPost =
    await MyGlobal.prisma.reddit_like_community_report_on_posts.findUniqueOrThrow(
      {
        where: { id: props.reportOnPostId },
        select: {
          id: true,
          reddit_like_community_report_id: true,
          reddit_like_community_post_id: true,
        },
      },
    );
  if (reportOnPost.reddit_like_community_report_id !== props.reportId) {
    throw new HttpException("Junction record does not match the report", 400);
  }
  const now = new Date();
  if (props.body.status === "approved") {
    await MyGlobal.prisma.reddit_like_community_posts.update({
      where: { id: reportOnPost.reddit_like_community_post_id },
      data: {
        deleted_at: now,
      },
    });
    await MyGlobal.prisma.reddit_like_community_reports.update({
      where: { id: props.reportId },
      data: {
        status: "approved",
        resolved_by_member_id: props.member.id,
        resolved_at: now,
        updated_at: now,
      },
    });
  } else if (props.body.status === "dismissed") {
    await MyGlobal.prisma.reddit_like_community_reports.update({
      where: { id: props.reportId },
      data: {
        status: "dismissed",
        resolved_by_member_id: props.member.id,
        resolved_at: now,
        deleted_at: now,
        updated_at: now,
      },
    });
  } else {
    throw new HttpException("Invalid resolution status", 400);
  }
  const updated =
    await MyGlobal.prisma.reddit_like_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...REdditLikeCommunityReportTransformer.select(),
    });
  return await REdditLikeCommunityReportTransformer.transform(updated);
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
// import { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityReportOnPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnPost";
// import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
// import { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
// import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditLikeCommunityMemberReportsReportIdReportOnPostsReportOnPostId(props: {
//   member: MemberPayload;
//   reportId: string & tags.Format<"uuid">;
//   reportOnPostId: string & tags.Format<"uuid">;
//   body: IREdditLikeCommunityReport.IUpdate;
// }): Promise<IREdditLikeCommunityReport> {
//   await MyGlobal.prisma.reddit_like_community_reports.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_like_community_reports.findUniqueOrThrow({
//     where: { ... },
//     ...REdditLikeCommunityReportTransformer.select(),
//   });
//   return await REdditLikeCommunityReportTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------