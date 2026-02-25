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
import { RedditCommunityReportCollector } from "../collectors/RedditCommunityReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberReports(props: {
  member: MemberPayload;
  body: IRedditCommunityReport.ICreate;
}): Promise<IRedditCommunityReport> {
  if (!props.body.postId && !props.body.commentId) {
    throw new HttpException("Must specify either postId or commentId", 400);
  }
  if (props.body.postId && props.body.commentId) {
    throw new HttpException("Cannot specify both postId and commentId", 400);
  }
  if (props.body.postId) {
    const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow(
      {
        where: { id: props.body.postId },
        select: { author_id: true },
      },
    );
    if (post.author_id === props.member.id) {
      throw new HttpException("Cannot report your own content", 403);
    }
  } else if (props.body.commentId) {
    const comment =
      await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
        where: { id: props.body.commentId },
        select: { author_id: true },
      });
    if (comment.author_id === props.member.id) {
      throw new HttpException("Cannot report your own content", 403);
    }
  }
  const created = await MyGlobal.prisma.reddit_community_reports.create({
    data: await RedditCommunityReportCollector.collect({
      body: props.body,
      redditCommunityMembers: props.member,
    }),
    include: {
      reporter: true,
      resolver: true,
      postReport: true,
      commentReport: true,
    },
  });
  return typia.assert<IRedditCommunityReport>(created);
}
