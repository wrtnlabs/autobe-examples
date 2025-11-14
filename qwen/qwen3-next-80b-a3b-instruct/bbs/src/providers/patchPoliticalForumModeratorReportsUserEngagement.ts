import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumUserEngagement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumUserEngagement";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchPoliticalForumModeratorReportsUserEngagement(props: {
  moderator: ModeratorPayload;
  body: IPoliticalForumUserEngagement.IRequest;
}): Promise<IPoliticalForumUserEngagement> {
  let filters = {};
  if (props.body) {
    try {
      filters = JSON.parse(props.body);
    } catch (e) {
      throw new HttpException(
        "Invalid request body: must be a valid JSON string",
        400,
      );
    }
  }

  // Aggregation: posts by citizen
  const postAggregates = await MyGlobal.prisma.political_forum_posts.groupBy({
    by: ["citizen_id"],
    where: {
      deleted_at: null,
      ...((filters as any).created_at_from && {
        created_at: { gte: (filters as any).created_at_from },
      }),
      ...((filters as any).created_at_to && {
        created_at: { lte: (filters as any).created_at_to },
      }),
    },
    _count: {
      id: true,
    },
    _sum: {
      edit_count: true,
    },
    _min: {
      created_at: true,
    },
    _max: {
      created_at: true,
    },
  });

  // Aggregation: comments by citizen
  const commentAggregates =
    await MyGlobal.prisma.political_forum_comments.groupBy({
      by: ["citizen_id"],
      where: {
        deleted_at: null,
        ...((filters as any).created_at_from && {
          created_at: { gte: (filters as any).created_at_from },
        }),
        ...((filters as any).created_at_to && {
          created_at: { lte: (filters as any).created_at_to },
        }),
      },
      _count: {
        id: true,
      },
      _min: {
        created_at: true,
      },
      _max: {
        created_at: true,
      },
    });

  // Join post_reports with political_forum_posts to get citizen_id
  const postReportAggregates =
    await MyGlobal.prisma.political_forum_post_reports.groupBy({
      by: ["political_forum_post_id"],
      where: {
        deleted_at: null,
        ...((filters as any).created_at_from && {
          created_at: { gte: (filters as any).created_at_from },
        }),
        ...((filters as any).created_at_to && {
          created_at: { lte: (filters as any).created_at_to },
        }),
      },
      _count: {
        id: true,
      },
    });

  // Join comment_reports with political_forum_comments to get citizen_id
  const commentReportAggregates =
    await MyGlobal.prisma.political_forum_comment_reports.groupBy({
      by: ["political_forum_comment_id"],
      where: {
        deleted_at: null,
        ...((filters as any).created_at_from && {
          created_at: { gte: (filters as any).created_at_from },
        }),
        ...((filters as any).created_at_to && {
          created_at: { lte: (filters as any).created_at_to },
        }),
      },
      _count: {
        id: true,
      },
    });

  // Create map from post id -> citizen_id
  const postToCitizenMap = new Map<string, string>();
  for (const post of postAggregates) {
    postToCitizenMap.set(post.citizen_id, post.citizen_id);
  }
  // Instead: we need to map post_reports to their parent post's citizen_id

  // Workaround: First fetch all post_ids and their citizen_id
  const postCitizenPairs = await MyGlobal.prisma.political_forum_posts.findMany(
    {
      where: {
        deleted_at: null,
        ...((filters as any).created_at_from && {
          created_at: { gte: (filters as any).created_at_from },
        }),
        ...((filters as any).created_at_to && {
          created_at: { lte: (filters as any).created_at_to },
        }),
      },
      select: {
        id: true,
        citizen_id: true,
      },
    },
  );
  const postIdToCitizenId = new Map<string, string>();
  for (const pair of postCitizenPairs) {
    postIdToCitizenId.set(pair.id, pair.citizen_id);
  }

  // Similarly for comments
  const commentCitizenPairs =
    await MyGlobal.prisma.political_forum_comments.findMany({
      where: {
        deleted_at: null,
        ...((filters as any).created_at_from && {
          created_at: { gte: (filters as any).created_at_from },
        }),
        ...((filters as any).created_at_to && {
          created_at: { lte: (filters as any).created_at_to },
        }),
      },
      select: {
        id: true,
        citizen_id: true,
      },
    });
  const commentIdToCitizenId = new Map<string, string>();
  for (const pair of commentCitizenPairs) {
    commentIdToCitizenId.set(pair.id, pair.citizen_id);
  }

  // Map report counts to citizen_id
  const postReportCountsByCitizenId: Record<string, number> = {};
  for (const report of postReportAggregates) {
    const citizenId = postIdToCitizenId.get(report.political_forum_post_id);
    if (citizenId) {
      if (!postReportCountsByCitizenId[citizenId]) {
        postReportCountsByCitizenId[citizenId] = 0;
      }
      postReportCountsByCitizenId[citizenId] += report._count.id;
    }
  }

  const commentReportCountsByCitizenId: Record<string, number> = {};
  for (const report of commentReportAggregates) {
    const citizenId = commentIdToCitizenId.get(
      report.political_forum_comment_id,
    );
    if (citizenId) {
      if (!commentReportCountsByCitizenId[citizenId]) {
        commentReportCountsByCitizenId[citizenId] = 0;
      }
      commentReportCountsByCitizenId[citizenId] += report._count.id;
    }
  }

  // Merge results
  const userMetrics: any[] = [];

  // Combine post aggregates
  for (const postAgg of postAggregates) {
    const citizenId = postAgg.citizen_id;
    const totalComments =
      commentAggregates.find((c) => c.citizen_id === citizenId)?._count.id || 0;
    const totalPostReports = postReportCountsByCitizenId[citizenId] || 0;
    const totalCommentReports = commentReportCountsByCitizenId[citizenId] || 0;
    const firstActivityAt = postAgg._min.created_at
      ? toISOStringSafe(postAgg._min.created_at)
      : toISOStringSafe(new Date());
    const lastActivityAt = postAgg._max.created_at
      ? toISOStringSafe(postAgg._max.created_at)
      : toISOStringSafe(new Date());

    userMetrics.push({
      user_id: citizenId,
      total_posts: postAgg._count.id,
      total_comments: totalComments,
      total_post_reports: totalPostReports,
      total_comment_reports: totalCommentReports,
      avg_comments_per_post:
        postAgg._count.id > 0 ? totalComments / postAgg._count.id : 0,
      post_report_ratio:
        postAgg._count.id > 0 ? totalPostReports / postAgg._count.id : 0,
      comment_report_ratio:
        totalComments > 0 ? totalCommentReports / totalComments : 0,
      first_activity_at: firstActivityAt,
      last_activity_at: lastActivityAt,
    });
  }

  // Include citizens with only comments (no posts)
  for (const commentAgg of commentAggregates) {
    const citizenId = commentAgg.citizen_id;
    if (!userMetrics.find((m) => m.user_id === citizenId)) {
      const totalPosts = 0;
      const totalPostReports = postReportCountsByCitizenId[citizenId] || 0;
      const totalCommentReports =
        commentReportCountsByCitizenId[citizenId] || 0;
      const firstActivityAt = commentAgg._min.created_at
        ? toISOStringSafe(commentAgg._min.created_at)
        : toISOStringSafe(new Date());
      const lastActivityAt = commentAgg._max.created_at
        ? toISOStringSafe(commentAgg._max.created_at)
        : toISOStringSafe(new Date());

      userMetrics.push({
        user_id: citizenId,
        total_posts: totalPosts,
        total_comments: commentAgg._count.id,
        total_post_reports: totalPostReports,
        total_comment_reports: totalCommentReports,
        avg_comments_per_post: 0,
        post_report_ratio: 0,
        comment_report_ratio: totalCommentReports / commentAgg._count.id,
        first_activity_at: firstActivityAt,
        last_activity_at: lastActivityAt,
      });
    }
  }

  // Return as string per IPoliticalForumUserEngagement = string
  return JSON.stringify(userMetrics);
}
