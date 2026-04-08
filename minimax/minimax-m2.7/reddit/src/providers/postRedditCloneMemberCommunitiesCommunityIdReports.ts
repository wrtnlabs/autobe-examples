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
import { RedditCloneCommunityReportCollector } from "../collectors/RedditCloneCommunityReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityReportTransformer } from "../transformers/RedditCloneCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommunitiesCommunityIdReports(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunityReport.ICreate;
}): Promise<IRedditCloneCommunityReport> {
  // Validate community exists and is not deleted
  const community = await MyGlobal.prisma.reddit_clone_communities.findFirst({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Validate content based on target_type
  if (props.body.target_type === "post") {
    // Verify post exists and belongs to the community
    const post = await MyGlobal.prisma.reddit_clone_posts.findFirst({
      where: {
        id: props.body.target_id,
        reddit_clone_community_id: props.communityId,
        deleted_at: null,
      },
      select: { reddit_clone_member_id: true },
    });
    if (!post) {
      throw new HttpException("Post not found in this community", 404);
    }
    // Prevent self-reporting
    if (post.reddit_clone_member_id === props.member.id) {
      throw new HttpException("Cannot report your own content", 403);
    }
  } else if (props.body.target_type === "comment") {
    // Verify comment exists and its parent post belongs to the community
    const comment = await MyGlobal.prisma.reddit_clone_comments.findFirst({
      where: {
        id: props.body.target_id,
        deleted_at: null,
      },
      select: {
        reddit_clone_member_id: true,
        reddit_clone_post_id: true,
      },
    });
    if (!comment) {
      throw new HttpException("Comment not found", 404);
    }
    // Verify parent post belongs to the community
    const post = await MyGlobal.prisma.reddit_clone_posts.findFirst({
      where: {
        id: comment.reddit_clone_post_id,
        reddit_clone_community_id: props.communityId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!post) {
      throw new HttpException("Comment not found in this community", 404);
    }
    // Prevent self-reporting
    if (comment.reddit_clone_member_id === props.member.id) {
      throw new HttpException("Cannot report your own content", 403);
    }
  } else {
    throw new HttpException("Invalid target_type", 400);
  }
  // Prevent duplicate reports (one per user per content)
  const existingReport = await MyGlobal.prisma.reddit_clone_reports.findFirst({
    where: {
      reddit_clone_member_id: props.member.id,
      target_type: props.body.target_type,
      target_id: props.body.target_id,
    },
    select: { id: true },
  });
  if (existingReport) {
    throw new HttpException("You have already reported this content", 409);
  }
  // Create the report
  const record = await MyGlobal.prisma.reddit_clone_reports.create({
    data: await RedditCloneCommunityReportCollector.collect({
      body: props.body,
      redditCloneCommunities: { id: props.communityId },
      redditCloneMembers: { id: props.member.id },
      redditCloneMemberSessions: { id: props.member.session_id },
    }),
    ...RedditCloneCommunityReportTransformer.select(),
  });
  return await RedditCloneCommunityReportTransformer.transform(record);
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
// export async function postRedditCloneMemberCommunitiesCommunityIdReports(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   body: IRedditCloneCommunityReport.ICreate;
// }): Promise<IRedditCloneCommunityReport> {
//   const record = await MyGlobal.prisma.reddit_clone_reports.create({
//     data: await RedditCloneCommunityReportCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditCloneCommunityReportTransformer.select(),
//   });
//   return await RedditCloneCommunityReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------