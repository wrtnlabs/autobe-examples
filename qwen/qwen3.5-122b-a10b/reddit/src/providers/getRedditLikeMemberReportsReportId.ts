import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { IRedditLikeReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfComment";
import { IRedditLikeReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeReportTransformer } from "../transformers/RedditLikeReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeReport> {
  // Get basic report info to determine actor_type
  const report = await MyGlobal.prisma.reddit_like_reports.findFirstOrThrow({
    where: {
      id: props.reportId,
      deleted_at: null,
    },
    select: {
      id: true,
      actor_type: true,
    },
  });
  // Determine community ID based on actor_type
  let communityId: string;
  if (report.actor_type === "post") {
    const postTarget =
      await MyGlobal.prisma.reddit_like_report_of_posts.findUniqueOrThrow({
        where: {
          reddit_like_report_id: props.reportId,
        },
        select: {
          reddit_like_post_id: true,
        },
      });
    const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
      where: {
        id: postTarget.reddit_like_post_id,
      },
      select: {
        reddit_like_community_id: true,
      },
    });
    communityId = post.reddit_like_community_id;
  } else {
    // actor_type === "comment"
    const commentTarget =
      await MyGlobal.prisma.reddit_like_report_of_comments.findUniqueOrThrow({
        where: {
          reddit_like_report_id: props.reportId,
        },
        select: {
          reddit_like_comment_id: true,
        },
      });
    const comment =
      await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
        where: {
          id: commentTarget.reddit_like_comment_id,
        },
        select: {
          reddit_like_post_id: true,
        },
      });
    const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
      where: {
        id: comment.reddit_like_post_id,
      },
      select: {
        reddit_like_community_id: true,
      },
    });
    communityId = post.reddit_like_community_id;
  }
  // Verify member is moderator of this community
  const isModerator =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        reddit_like_community_id: communityId,
        reddit_like_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch full report with all relations using transformer
  const record = await MyGlobal.prisma.reddit_like_reports.findFirstOrThrow({
    where: {
      id: props.reportId,
      deleted_at: null,
    },
    ...RedditLikeReportTransformer.select(),
  });
  return await RedditLikeReportTransformer.transform(record);
}
