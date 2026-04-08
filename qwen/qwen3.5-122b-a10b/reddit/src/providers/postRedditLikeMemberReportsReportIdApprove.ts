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

export async function postRedditLikeMemberReportsReportIdApprove(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeReport> {
  const report = await MyGlobal.prisma.reddit_like_reports.findFirstOrThrow({
    where: {
      id: props.reportId,
      deleted_at: null,
    },
    select: {
      id: true,
      actor_type: true,
      status: true,
      reddit_like_member_id: true,
      postTarget: {
        select: {
          reddit_like_post_id: true,
          post: {
            select: {
              reddit_like_community_id: true,
            },
          },
        },
      },
      commentTarget: {
        select: {
          reddit_like_comment_id: true,
          comment: {
            select: {
              reddit_like_post_id: true,
              post: {
                select: {
                  reddit_like_community_id: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (report.status !== "pending") {
    throw new HttpException("Report is not pending", 409);
  }
  let communityId: string;
  if (report.actor_type === "post" && report.postTarget) {
    communityId = report.postTarget.post.reddit_like_community_id;
  } else if (report.actor_type === "comment" && report.commentTarget) {
    communityId = report.commentTarget.comment.post.reddit_like_community_id;
  } else {
    throw new HttpException("Reported content not found", 404);
  }
  const isModerator =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        reddit_like_community_id: communityId,
        reddit_like_member_id: props.member.id,
        deleted_at: null,
      },
    });
  const isOwner = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      id: communityId,
      owner_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!isModerator && !isOwner) {
    throw new HttpException("Forbidden", 403);
  }
  if (report.reddit_like_member_id === props.member.id) {
    throw new HttpException("Cannot approve own report", 403);
  }
  if (report.actor_type === "post" && report.postTarget) {
    await MyGlobal.prisma.reddit_like_posts.delete({
      where: { id: report.postTarget.reddit_like_post_id },
    });
  } else if (report.actor_type === "comment" && report.commentTarget) {
    await MyGlobal.prisma.reddit_like_comments.delete({
      where: { id: report.commentTarget.reddit_like_comment_id },
    });
  }
  await MyGlobal.prisma.reddit_like_reports.update({
    where: { id: props.reportId },
    data: {
      status: "approved",
    },
  });
  const updatedReport =
    await MyGlobal.prisma.reddit_like_reports.findFirstOrThrow({
      where: { id: props.reportId },
      ...RedditLikeReportTransformer.select(),
    });
  return await RedditLikeReportTransformer.transform(updatedReport);
}
