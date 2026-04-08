import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommentReportCollector } from "../collectors/RedditCommunityCommentReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentReportTransformer } from "../transformers/RedditCommunityCommentReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberPostsPostIdCommentsCommentIdReports(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentReport.ICreate;
}): Promise<IRedditCommunityCommentReport> {
  // Step 1: Validate comment exists and get its metadata
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findFirstOrThrow({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
      include: {
        post: {
          select: {
            reddit_community_community_id: true,
          },
        },
      },
    });
  // Verify comment belongs to the specified post
  if (comment.reddit_community_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      400,
    );
  }
  // Step 2: Check if member has already reported this comment (unique constraint)
  const existingReport =
    await MyGlobal.prisma.reddit_community_comment_reports.findFirst({
      where: {
        reddit_community_comment_id: props.commentId,
        reddit_community_user_id: props.member.id,
      },
    });
  if (existingReport !== null) {
    throw new HttpException("You have already reported this comment", 409);
  }
  // Step 3: Validate member is not the comment author (cannot report own comments)
  if (comment.reddit_community_member_id === props.member.id) {
    throw new HttpException("You cannot report your own comment", 403);
  }
  // Step 4: Get community_id from comment's post
  const communityId = comment.post.reddit_community_community_id;
  // Step 5: Create report with status: pending
  const created = await MyGlobal.prisma.reddit_community_comment_reports.create(
    {
      data: await RedditCommunityCommentReportCollector.collect({
        body: props.body,
        redditCommunityComments: { id: props.commentId },
        redditCommunityMembers: { id: props.member.id },
      }),
      ...RedditCommunityCommentReportTransformer.select(),
    },
  );
  // Step 6: Return transformed report
  return await RedditCommunityCommentReportTransformer.transform(created);
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
// import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
// import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCommunityMemberPostsPostIdCommentsCommentIdReports(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   commentId: string & tags.Format<"uuid">;
//   body: IRedditCommunityCommentReport.ICreate;
// }): Promise<IRedditCommunityCommentReport> {
//   const record = await MyGlobal.prisma.reddit_community_comment_reports.create({
//     data: await RedditCommunityCommentReportCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditCommunityCommentReportTransformer.select(),
//   });
//   return await RedditCommunityCommentReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------