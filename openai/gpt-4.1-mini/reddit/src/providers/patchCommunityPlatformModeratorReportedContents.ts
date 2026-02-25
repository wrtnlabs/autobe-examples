import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportedContent";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorReportedContents(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformReportedContent.IRequest;
}): Promise<IPageICommunityPlatformReportedContent.ISummary> {
  const page: number = props.body.page ?? 1;
  const limitRaw: number = props.body.limit ?? 20;
  const limit: number = limitRaw > 100 ? 100 : limitRaw;
  const skip: number = (page - 1) * limit;
  const whereClause: Prisma.community_platform_reported_contentsWhereInput = {};
  if (props.body.contentType === "post") {
    whereClause.community_platform_reported_post_id = { not: null };
  } else if (props.body.contentType === "comment") {
    whereClause.community_platform_reported_comment_id = { not: null };
  }
  if (props.body.createdAfter != null) {
    whereClause.created_at = { gte: props.body.createdAfter };
  }
  if (props.body.createdBefore != null) {
    if (
      typeof whereClause.created_at === "object" &&
      whereClause.created_at !== null
    ) {
      whereClause.created_at = {
        ...whereClause.created_at,
        lt: props.body.createdBefore,
      };
    } else {
      whereClause.created_at = { lt: props.body.createdBefore };
    }
  }
  if (props.body.isDeleted != null) {
    whereClause.deleted_at = props.body.isDeleted ? { not: null } : null;
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_reported_contents.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community_platform_report: {
          select: {
            id: true,
            description: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            community_platform_user: {
              select: {
                id: true,
                email: true,
                username: true,
                display_name: true,
                bio: true,
                avatar_url: true,
                karma: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            community_platform_report_reason: {
              select: {
                id: true,
                reason_text: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
        community_platform_reported_post: {
          select: {
            id: true,
            title: true,
            post_type: true,
            community_platform_community_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        community_platform_reported_comment: {
          select: {
            id: true,
            content: true,
            is_deleted: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.community_platform_reported_contents.count({
      where: whereClause,
    }),
  ]);
  const mappedData: ICommunityPlatformReportedContent.ISummary[] = [];
  for (const item of data) {
    const report = item.community_platform_report;
    const user = report?.community_platform_user;
    const reportReason = report?.community_platform_report_reason;
    const post = item.community_platform_reported_post;
    const comment = item.community_platform_reported_comment;
    mappedData.push({
      id: item.id,
      created_at: toISOStringSafe(item.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(item.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at: item.deleted_at
        ? (toISOStringSafe(item.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
      report: report
        ? {
            id: report.id,
            description: report.description,
            status: report.status,
            reportedContents_count: 0, // Prisma does not auto-load count, so default 0
            created_at: toISOStringSafe(report.created_at) as string &
              tags.Format<"date-time">,
            updated_at: toISOStringSafe(report.updated_at) as string &
              tags.Format<"date-time">,
            deleted_at: report.deleted_at
              ? (toISOStringSafe(report.deleted_at) as string &
                  tags.Format<"date-time">)
              : null,
            user: user
              ? {
                  id: user.id,
                  email: user.email,
                  username: user.username,
                  displayName: user.display_name,
                  bio: user.bio === null ? null : (user.bio ?? undefined),
                  avatarUrl:
                    user.avatar_url === null
                      ? null
                      : (user.avatar_url ?? undefined),
                  karma: user.karma,
                  createdAt: toISOStringSafe(user.created_at) as string &
                    tags.Format<"date-time">,
                  updatedAt: toISOStringSafe(user.updated_at) as string &
                    tags.Format<"date-time">,
                  deletedAt: user.deleted_at
                    ? (toISOStringSafe(user.deleted_at) as string &
                        tags.Format<"date-time">)
                    : null,
                }
              : null,
            reportReason: reportReason
              ? {
                  id: reportReason.id,
                  reasonText: reportReason.reason_text,
                  createdAt: toISOStringSafe(
                    reportReason.created_at,
                  ) as string & tags.Format<"date-time">,
                  updatedAt: toISOStringSafe(
                    reportReason.updated_at,
                  ) as string & tags.Format<"date-time">,
                  deletedAt: reportReason.deleted_at
                    ? (toISOStringSafe(reportReason.deleted_at) as string &
                        tags.Format<"date-time">)
                    : null,
                }
              : null,
          }
        : null,
      reportedPost: post
        ? {
            id: post.id,
            title: post.title,
            postType: post.post_type,
            community: {
              id: post.community_platform_community_id,
            } satisfies ICommunityPlatformCommunity.ISummary,
            createdAt: toISOStringSafe(post.created_at) as string &
              tags.Format<"date-time">,
            updatedAt: toISOStringSafe(post.updated_at) as string &
              tags.Format<"date-time">,
            deletedAt: post.deleted_at
              ? (toISOStringSafe(post.deleted_at) as string &
                  tags.Format<"date-time">)
              : null,
          }
        : null,
      reportedComment: comment
        ? {
            id: comment.id,
            content: comment.content,
            isDeleted: comment.is_deleted,
            createdAt: toISOStringSafe(comment.created_at) as string &
              tags.Format<"date-time">,
            updatedAt: toISOStringSafe(comment.updated_at) as string &
              tags.Format<"date-time">,
          }
        : null,
    });
  }
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: mappedData,
  };
}
