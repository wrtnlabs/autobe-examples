import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeReportTransformer } from "../transformers/RedditLikeReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditLikeReport.IRequest;
}): Promise<IRedditLikeReport> {
  const report = await MyGlobal.prisma.reddit_like_reports.findFirst({
    where: {
      id: props.reportId,
      status: "pending",
      deleted_at: null,
      OR: [
        {
          reported_post_id: { not: null },
          reportedPost: {
            community: {
              moderatorRoles: {
                some: {
                  user_id: props.moderator.id,
                },
              },
            },
          },
        },
        {
          reported_comment_id: { not: null },
          reportedComment: {
            post: {
              community: {
                moderatorRoles: {
                  some: {
                    user_id: props.moderator.id,
                  },
                },
              },
            },
          },
        },
      ],
    },
    include: {
      reporter: true,
      reportedPost: {
        include: {
          community: {
            include: {
              moderatorRoles: {
                where: {
                  user_id: props.moderator.id,
                },
              },
            },
          },
        },
      },
      reportedComment: {
        include: {
          post: {
            include: {
              community: {
                include: {
                  moderatorRoles: {
                    where: {
                      user_id: props.moderator.id,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!report) {
    throw new HttpException("Report not found or already processed", 404);
  }
  const hasJurisdiction = report.reported_post_id
    ? (report.reportedPost as any).community.moderatorRoles.length > 0
    : report.reported_comment_id && report.reportedComment
      ? (report.reportedComment as any).post.community.moderatorRoles.length > 0
      : false;
  if (!hasJurisdiction) {
    throw new HttpException("Forbidden - not moderator of this community", 403);
  }
  let updatedReport;
  if (props.body.status === "approved") {
    if (report.reported_post_id) {
      const existingPost = await MyGlobal.prisma.reddit_like_posts.findUnique({
        where: { id: report.reported_post_id },
        select: { deleted_at: true },
      });
      if (!existingPost?.deleted_at) {
        await MyGlobal.prisma.reddit_like_posts.update({
          where: { id: report.reported_post_id },
          data: { deleted_at: new Date().toISOString() },
        });
      }
    } else if (report.reported_comment_id) {
      const existingComment =
        await MyGlobal.prisma.reddit_like_comments.findUnique({
          where: { id: report.reported_comment_id },
          select: { deleted_at: true },
        });
      if (!existingComment?.deleted_at) {
        await MyGlobal.prisma.reddit_like_comments.update({
          where: { id: report.reported_comment_id },
          data: { deleted_at: new Date().toISOString() },
        });
      }
    }
    updatedReport = await MyGlobal.prisma.reddit_like_reports.update({
      where: { id: props.reportId },
      data: {
        status: "approved",
        updated_at: new Date().toISOString(),
      },
      ...RedditLikeReportTransformer.select(),
    });
  } else {
    updatedReport = await MyGlobal.prisma.reddit_like_reports.update({
      where: { id: props.reportId },
      data: {
        status: "dismissed",
        updated_at: new Date().toISOString(),
      },
      ...RedditLikeReportTransformer.select(),
    });
  }
  return await RedditLikeReportTransformer.transform(updatedReport);
}
