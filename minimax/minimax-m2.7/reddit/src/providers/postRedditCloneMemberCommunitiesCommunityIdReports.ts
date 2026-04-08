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
  // 1. Validate community exists and is not soft-deleted
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: { id: props.communityId },
    select: { id: true, deleted_at: true },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  if (community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Validate target content exists and belongs to community
  let targetMemberId: string;
  if (props.body.target_type === "post") {
    const post = await MyGlobal.prisma.reddit_clone_posts.findUnique({
      where: { id: props.body.target_id },
      select: {
        id: true,
        reddit_clone_member_id: true,
        reddit_clone_community_id: true,
      },
    });
    if (post === null) {
      throw new HttpException("Post not found", 404);
    }
    if (post.reddit_clone_community_id !== props.communityId) {
      throw new HttpException("Post not found", 404);
    }
    targetMemberId = post.reddit_clone_member_id;
  } else if (props.body.target_type === "comment") {
    const comment = await MyGlobal.prisma.reddit_clone_comments.findUnique({
      where: { id: props.body.target_id },
      select: {
        id: true,
        reddit_clone_member_id: true,
        reddit_clone_post_id: true,
      },
    });
    if (comment === null) {
      throw new HttpException("Comment not found", 404);
    }
    // Verify parent post belongs to the community
    const post = await MyGlobal.prisma.reddit_clone_posts.findUnique({
      where: { id: comment.reddit_clone_post_id },
      select: { id: true, reddit_clone_community_id: true },
    });
    if (post === null || post.reddit_clone_community_id !== props.communityId) {
      throw new HttpException("Comment not found", 404);
    }
    targetMemberId = comment.reddit_clone_member_id;
  } else {
    throw new HttpException("Invalid target_type", 400);
  }
  // 3. Self-report prevention
  if (targetMemberId === props.member.id) {
    throw new HttpException("Cannot report your own content", 403);
  }
  // 4. Duplicate report check
  const existingReport = await MyGlobal.prisma.reddit_clone_reports.findFirst({
    where: {
      reddit_clone_member_id: props.member.id,
      target_type: props.body.target_type,
      target_id: props.body.target_id,
    },
  });
  if (existingReport !== null) {
    throw new HttpException("Report already exists", 409);
  }
  // 5. Create report using collector
  const created = await MyGlobal.prisma.reddit_clone_reports.create({
    data: await RedditCloneCommunityReportCollector.collect({
      body: props.body,
      redditCloneCommunities: { id: community.id },
      redditCloneMembers: { id: props.member.id },
      redditCloneMemberSessions: { id: props.member.session_id },
    }),
    ...RedditCloneCommunityReportTransformer.select(),
  });
  // 6. Return transformed response
  return await RedditCloneCommunityReportTransformer.transform(created);
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