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

export async function putRedditLikeMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditLikeReport.IUpdate;
}): Promise<IRedditLikeReport> {
  const report = await MyGlobal.prisma.reddit_like_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      id: true,
      actor_type: true,
      status: true,
      reddit_like_member_id: true,
    },
  });
  if (report.status !== "pending") {
    throw new HttpException("Report is not in pending status", 400);
  }
  if (report.reddit_like_member_id === props.member.id) {
    throw new HttpException("Cannot approve your own report", 409);
  }
  let communityId: string;
  if (report.actor_type === "post") {
    const postTarget =
      await MyGlobal.prisma.reddit_like_report_of_posts.findUniqueOrThrow({
        where: { reddit_like_report_id: props.reportId },
        select: {
          reddit_like_post_id: true,
        },
      });
    const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
      where: { id: postTarget.reddit_like_post_id },
      select: {
        reddit_like_community_id: true,
      },
    });
    communityId = post.reddit_like_community_id;
  } else if (report.actor_type === "comment") {
    const commentTarget =
      await MyGlobal.prisma.reddit_like_report_of_comments.findUniqueOrThrow({
        where: { reddit_like_report_id: props.reportId },
        select: {
          reddit_like_comment_id: true,
        },
      });
    const comment =
      await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
        where: { id: commentTarget.reddit_like_comment_id },
        select: {
          reddit_like_post_id: true,
        },
      });
    const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
      where: { id: comment.reddit_like_post_id },
      select: {
        reddit_like_community_id: true,
      },
    });
    communityId = post.reddit_like_community_id;
  } else {
    throw new HttpException("Invalid report target", 400);
  }
  const isModerator =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        reddit_like_community_id: communityId,
        reddit_like_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!isModerator) {
    throw new HttpException("Not authorized to moderate this community", 403);
  }
  if (props.body.status === undefined) {
    throw new HttpException("Status is required", 400);
  }
  const newStatus = props.body.status;
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (newStatus === "approved") {
      if (report.actor_type === "post") {
        const postTarget =
          await MyGlobal.prisma.reddit_like_report_of_posts.findUniqueOrThrow({
            where: { reddit_like_report_id: props.reportId },
            select: { reddit_like_post_id: true },
          });
        await tx.reddit_like_posts.delete({
          where: { id: postTarget.reddit_like_post_id },
        });
      } else if (report.actor_type === "comment") {
        const commentTarget =
          await MyGlobal.prisma.reddit_like_report_of_comments.findUniqueOrThrow(
            {
              where: { reddit_like_report_id: props.reportId },
              select: { reddit_like_comment_id: true },
            },
          );
        await tx.reddit_like_comments.delete({
          where: { id: commentTarget.reddit_like_comment_id },
        });
      }
    }
    await tx.reddit_like_reports.update({
      where: { id: props.reportId },
      data: {
        status: newStatus,
        updated_at: new Date(),
      },
    });
  });
  const updated = await MyGlobal.prisma.reddit_like_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    ...RedditLikeReportTransformer.select(),
  });
  return await RedditLikeReportTransformer.transform(updated);
}
