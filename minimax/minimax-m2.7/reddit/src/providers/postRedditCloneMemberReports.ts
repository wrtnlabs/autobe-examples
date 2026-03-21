import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneReportCollector } from "../collectors/RedditCloneReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneReportTransformer } from "../transformers/RedditCloneReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberReports(props: {
  member: MemberPayload;
  body: IRedditCloneReport.ICreate;
}): Promise<IRedditCloneReport> {
  // Step 1: Query target content based on target_type
  const targetType = props.body.target_type;
  const targetId = props.body.target_id;
  let communityId: string = "";
  let authorId: string = "";
  if (targetType === "post") {
    const post = await MyGlobal.prisma.reddit_clone_posts.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        reddit_clone_member_id: true,
        reddit_clone_community_id: true,
      },
    });
    if (!post) {
      throw new HttpException("Post not found", 404);
    }
    communityId = post.reddit_clone_community_id;
    authorId = post.reddit_clone_member_id;
  } else {
    const comment = await MyGlobal.prisma.reddit_clone_comments.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        reddit_clone_member_id: true,
        post: {
          select: { reddit_clone_community_id: true },
        },
      },
    });
    if (!comment) {
      throw new HttpException("Comment not found", 404);
    }
    communityId = comment.post.reddit_clone_community_id;
    authorId = comment.reddit_clone_member_id;
  }
  // Step 2: Check if reporting own content
  if (authorId === props.member.id) {
    throw new HttpException("Cannot report your own content", 403);
  }
  // Step 3: Check for duplicate report
  const existingReport = await MyGlobal.prisma.reddit_clone_reports.findFirst({
    where: {
      reddit_clone_member_id: props.member.id,
      target_type: targetType,
      target_id: targetId,
    },
    select: { id: true },
  });
  if (existingReport) {
    throw new HttpException("You have already reported this content", 409);
  }
  // Step 4: Create report entity reference for collector
  const memberEntity: IEntity = {
    id: props.member.id,
  };
  const communityEntity: IEntity = {
    id: communityId as string & tags.Format<"uuid">,
  };
  // Step 5: Create the report
  const report = await MyGlobal.prisma.reddit_clone_reports.create({
    data: await RedditCloneReportCollector.collect({
      body: props.body,
      redditCloneMembers: memberEntity,
      redditCloneCommunities: communityEntity,
    }),
    ...RedditCloneReportTransformer.select(),
  });
  // Step 6: Transform and return
  return await RedditCloneReportTransformer.transform(report);
}
