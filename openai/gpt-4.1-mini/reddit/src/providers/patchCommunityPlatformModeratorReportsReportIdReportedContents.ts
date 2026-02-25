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

export async function patchCommunityPlatformModeratorReportsReportIdReportedContents(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportedContent.IRequest;
}): Promise<IPageICommunityPlatformReportedContent.ISummary> {
  const page = props.body.page ?? 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 100;
  const skip = (page - 1) * limit;
  const baseWhere: Prisma.community_platform_reported_contentsWhereInput = {
    community_platform_report_id: props.reportId,
  };
  const additionalFilters: Prisma.community_platform_reported_contentsWhereInput =
    {};
  if (props.body.contentType === "post") {
    additionalFilters.community_platform_reported_post_id = { not: null };
  } else if (props.body.contentType === "comment") {
    additionalFilters.community_platform_reported_comment_id = { not: null };
  }
  if (props.body.isDeleted !== undefined && props.body.isDeleted !== null) {
    additionalFilters.deleted_at = props.body.isDeleted ? { not: null } : null;
  }
  if (props.body.createdAfter) {
    additionalFilters.created_at = { gt: props.body.createdAfter };
  }
  if (props.body.createdBefore) {
    additionalFilters.created_at = { lt: props.body.createdBefore };
  }
  const whereFilter: Prisma.community_platform_reported_contentsWhereInput = {
    AND: [baseWhere, additionalFilters],
  };
  const total =
    await MyGlobal.prisma.community_platform_reported_contents.count({
      where: whereFilter,
    });
  const records =
    await MyGlobal.prisma.community_platform_reported_contents.findMany({
      where: whereFilter,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        report: {
          select: {
            id: true,
            description: true,
            status: true,
            reportedContents: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            user: {
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
            reportReason: {
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
        reportedPost: {
          select: {
            id: true,
            title: true,
            post_type: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            authorUser: {
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
            authorModerator: {
              select: {
                id: true,
                username: true,
                display_name: true,
                avatar_url: true,
                karma: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            community: {
              select: {
                id: true,
                name: true,
                description: true,
                icon_url: true,
                subscriberCount: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                ownerUser: {
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
              },
            },
            vote_score: true,
            comment_count: true,
          },
        },
        reportedComment: {
          select: {
            id: true,
            content: true,
            is_deleted: true,
            parent_id: true,
            created_at: true,
            updated_at: true,
            authorId: true,
            author: {
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
            children: {
              select: {
                id: true,
                content: true,
                is_deleted: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        },
      },
    });
  const data = records.map((record) => {
    const report = record.report;
    const reportedPost = record.reportedPost;
    const reportedComment = record.reportedComment;
    return {
      id: record.id,
      created_at: toISOStringSafe(record.created_at) satisfies string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(record.updated_at) satisfies string &
        tags.Format<"date-time">,
      deleted_at: (record.deleted_at
        ? toISOStringSafe(record.deleted_at)
        : null) satisfies (string & tags.Format<"date-time">) | null,
      report: report
        ? {
            id: report.id,
            description: report.description,
            status: report.status,
            user: report.user
              ? {
                  id: report.user.id,
                  email: report.user.email,
                  username: report.user.username,
                  displayName: report.user.display_name,
                  bio: report.user.bio ?? null,
                  avatarUrl: report.user.avatar_url ?? null,
                  karma: report.user.karma,
                  createdAt: toISOStringSafe(
                    report.user.created_at,
                  ) satisfies string & tags.Format<"date-time">,
                  updatedAt: toISOStringSafe(
                    report.user.updated_at,
                  ) satisfies string & tags.Format<"date-time">,
                  deletedAt: (report.user.deleted_at
                    ? toISOStringSafe(report.user.deleted_at)
                    : null) satisfies
                    | (string & tags.Format<"date-time">)
                    | null,
                }
              : null,
            reportReason: report.reportReason
              ? {
                  id: report.reportReason.id,
                  reasonText: report.reportReason.reason_text,
                  createdAt: toISOStringSafe(
                    report.reportReason.created_at,
                  ) satisfies string & tags.Format<"date-time">,
                  updatedAt: toISOStringSafe(
                    report.reportReason.updated_at,
                  ) satisfies string & tags.Format<"date-time">,
                  deletedAt: (report.reportReason.deleted_at
                    ? toISOStringSafe(report.reportReason.deleted_at)
                    : null) satisfies
                    | (string & tags.Format<"date-time">)
                    | null,
                }
              : null,
            reportedContents_count:
              report.reportedContents_Count ?? report.reportedContents ?? 0,
            created_at: toISOStringSafe(report.created_at) satisfies string &
              tags.Format<"date-time">,
            updated_at: toISOStringSafe(report.updated_at) satisfies string &
              tags.Format<"date-time">,
            deleted_at: (report.deleted_at
              ? toISOStringSafe(report.deleted_at)
              : null) satisfies (string & tags.Format<"date-time">) | null,
          }
        : null,
      reportedPost: reportedPost
        ? {
            id: reportedPost.id,
            title: reportedPost.title,
            postType: reportedPost.post_type,
            createdAt: toISOStringSafe(
              reportedPost.created_at,
            ) satisfies string & tags.Format<"date-time">,
            updatedAt: toISOStringSafe(
              reportedPost.updated_at,
            ) satisfies string & tags.Format<"date-time">,
            deletedAt: (reportedPost.deleted_at
              ? toISOStringSafe(reportedPost.deleted_at)
              : null) satisfies (string & tags.Format<"date-time">) | null,
            authorUser: reportedPost.authorUser
              ? {
                  id: reportedPost.authorUser.id,
                  email: reportedPost.authorUser.email,
                  username: reportedPost.authorUser.username,
                  displayName: reportedPost.authorUser.display_name,
                  bio: reportedPost.authorUser.bio ?? null,
                  avatarUrl: reportedPost.authorUser.avatar_url ?? null,
                  karma: reportedPost.authorUser.karma,
                  createdAt: toISOStringSafe(
                    reportedPost.authorUser.created_at,
                  ) satisfies string & tags.Format<"date-time">,
                  updatedAt: toISOStringSafe(
                    reportedPost.authorUser.updated_at,
                  ) satisfies string & tags.Format<"date-time">,
                  deletedAt: (reportedPost.authorUser.deleted_at
                    ? toISOStringSafe(reportedPost.authorUser.deleted_at)
                    : null) satisfies
                    | (string & tags.Format<"date-time">)
                    | null,
                }
              : null,
            authorModerator: reportedPost.authorModerator
              ? {
                  id: reportedPost.authorModerator.id,
                  username: reportedPost.authorModerator.username,
                  displayName: reportedPost.authorModerator.display_name,
                  avatarUrl: reportedPost.authorModerator.avatar_url ?? null,
                  karma: reportedPost.authorModerator.karma,
                  createdAt: toISOStringSafe(
                    reportedPost.authorModerator.created_at,
                  ) satisfies string & tags.Format<"date-time">,
                  updatedAt: toISOStringSafe(
                    reportedPost.authorModerator.updated_at,
                  ) satisfies string & tags.Format<"date-time">,
                  deletedAt: (reportedPost.authorModerator.deleted_at
                    ? toISOStringSafe(reportedPost.authorModerator.deleted_at)
                    : null) satisfies
                    | (string & tags.Format<"date-time">)
                    | null,
                }
              : null,
            community: {
              id: reportedPost.community.id,
              name: reportedPost.community.name,
              description: reportedPost.community.description,
              iconUrl: reportedPost.community.icon_url,
              subscriberCount: reportedPost.community.subscriber_count,
              createdAt: toISOStringSafe(
                reportedPost.community.created_at,
              ) satisfies string & tags.Format<"date-time">,
              updatedAt: toISOStringSafe(
                reportedPost.community.updated_at,
              ) satisfies string & tags.Format<"date-time">,
              deletedAt: (reportedPost.community.deleted_at
                ? toISOStringSafe(reportedPost.community.deleted_at)
                : null) satisfies (string & tags.Format<"date-time">) | null,
              ownerUser: reportedPost.community.ownerUser
                ? {
                    id: reportedPost.community.ownerUser.id,
                    email: reportedPost.community.ownerUser.email,
                    username: reportedPost.community.ownerUser.username,
                    displayName: reportedPost.community.ownerUser.display_name,
                    bio: reportedPost.community.ownerUser.bio ?? null,
                    avatarUrl:
                      reportedPost.community.ownerUser.avatar_url ?? null,
                    karma: reportedPost.community.ownerUser.karma,
                    createdAt: toISOStringSafe(
                      reportedPost.community.ownerUser.created_at,
                    ) satisfies string & tags.Format<"date-time">,
                    updatedAt: toISOStringSafe(
                      reportedPost.community.ownerUser.updated_at,
                    ) satisfies string & tags.Format<"date-time">,
                    deletedAt: (reportedPost.community.ownerUser.deleted_at
                      ? toISOStringSafe(
                          reportedPost.community.ownerUser.deleted_at,
                        )
                      : null) satisfies
                      | (string & tags.Format<"date-time">)
                      | null,
                  }
                : null,
            },
            voteScore: reportedPost.vote_score,
            commentCount: reportedPost.comment_count,
          }
        : null,
      reportedComment: reportedComment
        ? {
            id: reportedComment.id,
            content: reportedComment.content,
            isDeleted: reportedComment.is_deleted,
            createdAt: toISOStringSafe(
              reportedComment.created_at,
            ) satisfies string & tags.Format<"date-time">,
            updatedAt: toISOStringSafe(
              reportedComment.updated_at,
            ) satisfies string & tags.Format<"date-time">,
            author: reportedComment.author
              ? {
                  id: reportedComment.author.id,
                  email: reportedComment.author.email,
                  username: reportedComment.author.username,
                  displayName: reportedComment.author.display_name,
                  bio: reportedComment.author.bio ?? null,
                  avatarUrl: reportedComment.author.avatar_url ?? null,
                  karma: reportedComment.author.karma,
                  createdAt: toISOStringSafe(
                    reportedComment.author.created_at,
                  ) satisfies string & tags.Format<"date-time">,
                  updatedAt: toISOStringSafe(
                    reportedComment.author.updated_at,
                  ) satisfies string & tags.Format<"date-time">,
                  deletedAt: (reportedComment.author.deleted_at
                    ? toISOStringSafe(reportedComment.author.deleted_at)
                    : null) satisfies
                    | (string & tags.Format<"date-time">)
                    | null,
                }
              : null,
            parentId: reportedComment.parent_id ?? null,
            children: (reportedComment.children ?? []).map(
              (
                child: Pick<
                  Prisma.community_platform_comments,
                  "id" | "content" | "is_deleted" | "created_at" | "updated_at"
                >,
              ) =>
                ({
                  id: child.id,
                  content: child.content,
                  isDeleted: child.is_deleted,
                  createdAt: toISOStringSafe(
                    child.created_at,
                  ) satisfies string & tags.Format<"date-time">,
                  updatedAt: toISOStringSafe(
                    child.updated_at,
                  ) satisfies string & tags.Format<"date-time">,
                  author: null,
                  parentId: null,
                  children: [],
                }) satisfies ICommunityPlatformComment.ISummary,
            ),
          }
        : null,
    } satisfies ICommunityPlatformReportedContent.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data,
  } satisfies IPageICommunityPlatformReportedContent.ISummary;
}
