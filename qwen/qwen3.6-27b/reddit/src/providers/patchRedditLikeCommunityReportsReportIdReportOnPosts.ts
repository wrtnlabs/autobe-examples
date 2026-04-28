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
import { REdditLikeCommunityReportTransformer } from "../transformers/REdditLikeCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunityReportsReportIdReportOnPosts(props: {
  reportId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityReport.IUpdate;
}): Promise<IREdditLikeCommunityReport> {
  const status = props.body.status;
  if (status !== "approved" && status !== "dismissed") {
    throw new HttpException("Status must be approved or dismissed", 400);
  }
  const report =
    await MyGlobal.prisma.reddit_like_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        status: true,
        deleted_at: true,
        onPost: {
          select: {
            reddit_like_community_post_id: true,
          },
        },
      },
    });
  if (report.deleted_at !== null) {
    throw new HttpException("Report has been deleted", 404);
  }
  if (report.status !== "pending") {
    throw new HttpException("Report must be pending to be resolved", 400);
  }
  if (report.onPost === null) {
    throw new HttpException("Report does not target a post", 400);
  }
  const onPost = report.onPost;
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.reddit_like_community_reports.update({
      where: { id: props.reportId },
      data: {
        status,
        resolved_by_member_id: null,
        resolved_at: now,
        updated_at: now,
        deleted_at: status === "dismissed" ? now : null,
      },
    });
    if (status === "approved") {
      await tx.reddit_like_community_posts.update({
        where: { id: onPost.reddit_like_community_post_id },
        data: {
          deleted_at: now,
          updated_at: now,
        },
      });
    }
  });
  const resolved =
    await MyGlobal.prisma.reddit_like_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...REdditLikeCommunityReportTransformer.select(),
    });
  return await REdditLikeCommunityReportTransformer.transform(resolved);
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
// export async function patchRedditLikeCommunityReportsReportIdReportOnPosts(props: {
//   reportId: string & tags.Format<"uuid">;
//   body: IREdditLikeCommunityReport.IUpdate;
// }): Promise<IREdditLikeCommunityReport> {
//   const record = await MyGlobal.prisma.reddit_like_community_reports.findFirstOrThrow({
//     ...REdditLikeCommunityReportTransformer.select(),
//     where: { ... },
//   });
//   return await REdditLikeCommunityReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------