import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { REdditLikeCommunityReportOnCommentCollector } from "../collectors/REdditLikeCommunityReportOnCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { REdditLikeCommunityReportOnCommentTransformer } from "../transformers/REdditLikeCommunityReportOnCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeCommunityMemberReportsReportIdReportOnComments(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityReportOnComment.ICreate;
}): Promise<IREdditLikeCommunityReportOnComment> {
  const report =
    await MyGlobal.prisma.reddit_like_community_reports.findUniqueOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const existingPostLink =
    await MyGlobal.prisma.reddit_like_community_report_on_posts.findFirst({
      where: {
        reddit_like_community_report_id: props.reportId,
      },
    });
  if (existingPostLink !== null) {
    throw new HttpException("Report is already linked to content", 409);
  }
  const existingCommentLink =
    await MyGlobal.prisma.reddit_like_community_report_on_comments.findFirst({
      where: {
        reddit_like_community_report_id: props.reportId,
        deleted_at: null,
      },
    });
  if (existingCommentLink !== null) {
    throw new HttpException("Report is already linked to content", 409);
  }
  await MyGlobal.prisma.reddit_like_community_comments.findUniqueOrThrow({
    where: {
      id: props.body.comment_id,
      deleted_at: null,
    },
  });
  const record = await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.reddit_like_community_report_on_comments.create({
      data: await REdditLikeCommunityReportOnCommentCollector.collect({
        body: props.body,
        redditLikeCommunityReports: report,
      }),
      ...REdditLikeCommunityReportOnCommentTransformer.select(),
    });
    await tx.reddit_like_community_reports.update({
      where: { id: props.reportId },
      data: { target_type: "comment" },
    });
    return created;
  });
  return await REdditLikeCommunityReportOnCommentTransformer.transform(record);
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
// import { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
// import { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditLikeCommunityMemberReportsReportIdReportOnComments(props: {
//   member: MemberPayload;
//   reportId: string & tags.Format<"uuid">;
//   body: IREdditLikeCommunityReportOnComment.ICreate;
// }): Promise<IREdditLikeCommunityReportOnComment> {
//   const record = await MyGlobal.prisma.reddit_like_community_report_on_comments.create({
//     data: await REdditLikeCommunityReportOnCommentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...REdditLikeCommunityReportOnCommentTransformer.select(),
//   });
//   return await REdditLikeCommunityReportOnCommentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------