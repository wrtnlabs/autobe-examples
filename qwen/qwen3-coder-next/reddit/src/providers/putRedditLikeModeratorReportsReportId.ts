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
  reportId: string;
  body: IRedditLikeReport.IUpdate;
}): Promise<IRedditLikeReport> {
  // Find the report with necessary relations
  const report = await MyGlobal.prisma.reddit_like_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      id: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      reporter_id: true,
      reported_post_id: true,
      reported_comment_id: true,
      reason: true,
      reporter: {
        select: {
          id: true,
          created_at: true,
          username: true,
          display_name: true,
          bio: true,
          avatar_url: true,
          karma_score: true,
        },
      },
      reportedPost: {
        select: {
          url: true,
          created_at: true,
          id: true,
          content: true,
          author: {
            select: {
              created_at: true,
              id: true,
              username: true,
              display_name: true,
              bio: true,
              avatar_url: true,
              karma_score: true,
            },
          },
          title: true,
          type: true,
          image_url: true,
          score: true,
          comment_count: true,
          community: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              posts: {
                select: { id: true },
              },
              subscriptions: {
                select: { id: true },
              },
              moderatorRoles: {
                select: { id: true },
              },
              name: true,
              icon_url: true,
              owner: {
                select: { id: true },
              },
              userBans: {
                select: { id: true },
              },
              _count: {
                select: { subscriptions: true },
              },
            },
          },
        },
      },
      reportedComment: {
        select: {
          created_at: true,
          id: true,
          content: true,
          vote_score: true,
          updated_at: true,
          deleted_at: true,
          post_id: true,
          author: {
            select: {
              created_at: true,
              id: true,
              username: true,
              display_name: true,
              bio: true,
              avatar_url: true,
              karma_score: true,
            },
          },
          parentComment: {
            select: { id: true },
          },
        },
      },
    },
  });
  // Determine community ID from reported content
  const communityId =
    report.reported_post_id ||
    (report.reportedComment ? report.reportedComment.post_id : null);
  if (!communityId) {
    throw new HttpException("Reported content must belong to a community", 400);
  }
  // Verify moderator has access to this community
  const moderatorRole =
    await MyGlobal.prisma.reddit_like_moderator_roles.findFirst({
      where: {
        user_id: props.moderator.id,
        community_id: communityId,
      },
    });
  if (!moderatorRole) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate status transition: only pending can be changed
  if (report.status !== "pending") {
    throw new HttpException(`Report is already ${report.status}`, 400);
  }
  // Update the report status
  const updated = await MyGlobal.prisma.reddit_like_reports.update({
    where: { id: props.reportId },
    data: {
      status: props.body.status,
      updated_at: new Date().toISOString(),
    },
    select: {
      id: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      reporter_id: true,
      reported_post_id: true,
      reported_comment_id: true,
      reason: true,
      reporter: {
        select: {
          id: true,
          created_at: true,
          username: true,
          display_name: true,
          bio: true,
          avatar_url: true,
          karma_score: true,
        },
      },
      reportedPost: {
        select: {
          url: true,
          created_at: true,
          id: true,
          content: true,
          author: {
            select: {
              created_at: true,
              id: true,
              username: true,
              display_name: true,
              bio: true,
              avatar_url: true,
              karma_score: true,
            },
          },
          title: true,
          type: true,
          image_url: true,
          score: true,
          comment_count: true,
          community: {
            select: {
              created_at: true,
              id: true,
              updated_at: true,
              deleted_at: true,
              posts: {
                select: { id: true },
              },
              subscriptions: {
                select: { id: true },
              },
              moderatorRoles: {
                select: { id: true },
              },
              name: true,
              icon_url: true,
              owner: {
                select: { id: true },
              },
              userBans: {
                select: { id: true },
              },
              _count: {
                select: { subscriptions: true },
              },
            },
          },
        },
      },
      reportedComment: {
        select: {
          created_at: true,
          id: true,
          content: true,
          vote_score: true,
          updated_at: true,
          deleted_at: true,
          post_id: true,
          author: {
            select: {
              created_at: true,
              id: true,
              username: true,
              display_name: true,
              bio: true,
              avatar_url: true,
              karma_score: true,
            },
          },
          parentComment: {
            select: { id: true },
          },
        },
      },
    },
  });
  // Transform to response DTO
  return await RedditLikeReportTransformer.transform(updated);
}
