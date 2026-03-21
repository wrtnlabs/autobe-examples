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

export async function postRedditCloneMemberCommunitiesCommunityNameReports(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditCloneReport.ICreate;
}): Promise<IRedditCloneReport> {
  // 1. Look up community by name
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { name: props.communityName },
      select: { id: true, name: true },
    });
  // 2. Validate target content exists based on target_type
  if (props.body.target_type === "post") {
    const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
      where: { id: props.body.target_id },
      select: {
        id: true,
        reddit_clone_member_id: true,
        reddit_clone_community_id: true,
      },
    });
    // Verify post belongs to this community
    if (post.reddit_clone_community_id !== community.id) {
      throw new HttpException("Post does not belong to this community", 400);
    }
    // Self-reporting prevention
    if (post.reddit_clone_member_id === props.member.id) {
      throw new HttpException("Cannot report your own content", 403);
    }
  } else {
    const comment =
      await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
        where: { id: props.body.target_id },
        select: { id: true, reddit_clone_member_id: true },
      });
    // Self-reporting prevention
    if (comment.reddit_clone_member_id === props.member.id) {
      throw new HttpException("Cannot report your own content", 403);
    }
  }
  // 3. Check for duplicate report
  const existingReport = await MyGlobal.prisma.reddit_clone_reports.findFirst({
    where: {
      reddit_clone_member_id: props.member.id,
      target_type: props.body.target_type,
      target_id: props.body.target_id,
    },
  });
  if (existingReport) {
    throw new HttpException("You have already reported this content", 409);
  }
  // 4. Create the report using collector
  const created = await MyGlobal.prisma.reddit_clone_reports.create({
    data: await RedditCloneReportCollector.collect({
      body: props.body,
      redditCloneMembers: { id: props.member.id },
      redditCloneCommunities: { id: community.id },
    }),
    ...RedditCloneReportTransformer.select(),
  });
  // 5. Transform and return the response
  return await RedditCloneReportTransformer.transform(created);
}
