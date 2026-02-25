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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminReportedContents(props: {
  admin: AdminPayload;
  body: ICommunityPlatformReportedContent.IRequest;
}): Promise<IPageICommunityPlatformReportedContent.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereReportedContent: Prisma.community_platform_reported_contentsWhereInput =
    {
      ...(props.body.isDeleted === true && { deleted_at: { not: null } }),
      ...(props.body.isDeleted === false && { deleted_at: null }),
      ...(props.body.contentType === "post" && {
        community_platform_reported_post_id: { not: null },
      }),
      ...(props.body.contentType === "comment" && {
        community_platform_reported_comment_id: { not: null },
      }),
      ...(props.body.createdAfter && {
        created_at: { gte: props.body.createdAfter },
      }),
      ...(props.body.createdBefore && {
        created_at: { lte: props.body.createdBefore },
      }),
    };
  const reportedContents =
    await MyGlobal.prisma.community_platform_reported_contents.findMany({
      where: whereReportedContent,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        report: {
          select: {
            id: true,
            description: true,
            status: true,
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
            author_user_id: true,
            author_moderator_id: true,
            community: {
              select: {
                id: true,
                name: true,
                description: true,
                icon_url: true,
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
          },
        },
        reportedComment: {
          select: {
            id: true,
            content: true,
            is_deleted: true,
            created_at: true,
            updated_at: true,
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
            parent_id: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.community_platform_reported_contents.count({
      where: whereReportedContent,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(reportedContents, async (item) => {
      const createdAtString = toISOStringSafe(
        item.created_at,
      ) satisfies string & tags.Format<"date-time"> as string &
        tags.Format<"date-time">;
      const updatedAtString = toISOStringSafe(
        item.updated_at,
      ) satisfies string & tags.Format<"date-time"> as string &
        tags.Format<"date-time">;
      const deletedAtString =
        item.deleted_at === null
          ? null
          : (toISOStringSafe(item.deleted_at) satisfies string &
              tags.Format<"date-time"> as string & tags.Format<"date-time">);
      const report = item.report!;
      const reportCreatedAtString = toISOStringSafe(
        report.created_at,
      ) satisfies string & tags.Format<"date-time"> as string &
        tags.Format<"date-time">;
      const reportUpdatedAtString = toISOStringSafe(
        report.updated_at,
      ) satisfies string & tags.Format<"date-time"> as string &
        tags.Format<"date-time">;
      const reportDeletedAtString =
        report.deleted_at === null
          ? null
          : (toISOStringSafe(report.deleted_at) satisfies string &
              tags.Format<"date-time"> as string & tags.Format<"date-time">);
      const user = report.user!;
      const userCreatedAtString = toISOStringSafe(
        user.created_at,
      ) satisfies string & tags.Format<"date-time"> as string &
        tags.Format<"date-time">;
      const userUpdatedAtString = toISOStringSafe(
        user.updated_at,
      ) satisfies string & tags.Format<"date-time"> as string &
        tags.Format<"date-time">;
      const userDeletedAtString =
        user.deleted_at === null
          ? null
          : (toISOStringSafe(user.deleted_at) satisfies string &
              tags.Format<"date-time"> as string & tags.Format<"date-time">);
      const reason = report.reportReason!;
      const reasonCreatedAtString = toISOStringSafe(
        reason.created_at,
      ) satisfies string & tags.Format<"date-time"> as string &
        tags.Format<"date-time">;
      const reasonUpdatedAtString = toISOStringSafe(
        reason.updated_at,
      ) satisfies string & tags.Format<"date-time"> as string &
        tags.Format<"date-time">;
      const reasonDeletedAtString =
        reason.deleted_at === null
          ? null
          : (toISOStringSafe(reason.deleted_at) satisfies string &
              tags.Format<"date-time"> as string & tags.Format<"date-time">);
      const reportedPost = item.reportedPost ?? null;
      const reportedPostCreatedAtString = reportedPost
        ? (toISOStringSafe(reportedPost.created_at) satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">)
        : null;
      const reportedPostUpdatedAtString = reportedPost
        ? (toISOStringSafe(reportedPost.updated_at) satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">)
        : null;
      const reportedPostDeletedAtString =
        reportedPost === null
          ? null
          : reportedPost.deleted_at === null
            ? null
            : (toISOStringSafe(reportedPost.deleted_at) satisfies string &
                tags.Format<"date-time"> as string & tags.Format<"date-time">);
      const reportedComment = item.reportedComment ?? null;
      const reportedCommentCreatedAtString = reportedComment
        ? (toISOStringSafe(reportedComment.created_at) satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">)
        : null;
      const reportedCommentUpdatedAtString = reportedComment
        ? (toISOStringSafe(reportedComment.updated_at) satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">)
        : null;
      return {
        id: item.id,
        created_at: createdAtString,
        updated_at: updatedAtString,
        deleted_at: deletedAtString,
        report: {
          id: report.id,
          description: report.description,
          status: report.status,
          created_at: reportCreatedAtString,
          updated_at: reportUpdatedAtString,
          deleted_at: reportDeletedAtString,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.display_name,
            bio: user.bio ?? undefined,
            avatarUrl: user.avatar_url ?? undefined,
            karma: user.karma,
            createdAt: userCreatedAtString,
            updatedAt: userUpdatedAtString,
            deletedAt: userDeletedAtString,
          },
          reportReason: {
            id: reason.id,
            reasonText: reason.reason_text,
            createdAt: reasonCreatedAtString,
            updatedAt: reasonUpdatedAtString,
            deletedAt: reasonDeletedAtString,
          },
          reportedContents_count: 0,
        },
        reportedPost: reportedPost
          ? {
              id: reportedPost.id,
              title: reportedPost.title ?? undefined,
              postType: reportedPost.post_type,
              createdAt: reportedPostCreatedAtString!,
              updatedAt: reportedPostUpdatedAtString!,
              deletedAt: reportedPostDeletedAtString,
              authorUser: null,
              authorModerator: null,
              community: {
                id: reportedPost.community.id,
                name: reportedPost.community.name,
                description: reportedPost.community.description,
                iconUrl: reportedPost.community.icon_url,
                subscriberCount: 0,
                ownerUser: reportedPost.community.ownerUser
                  ? {
                      id: reportedPost.community.ownerUser.id,
                      email: reportedPost.community.ownerUser.email,
                      username: reportedPost.community.ownerUser.username,
                      displayName:
                        reportedPost.community.ownerUser.display_name,
                      bio: reportedPost.community.ownerUser.bio ?? undefined,
                      avatarUrl:
                        reportedPost.community.ownerUser.avatar_url ??
                        undefined,
                      karma: reportedPost.community.ownerUser.karma,
                      createdAt: toISOStringSafe(
                        reportedPost.community.ownerUser.created_at,
                      ) satisfies string & tags.Format<"date-time"> as string &
                        tags.Format<"date-time">,
                      updatedAt: toISOStringSafe(
                        reportedPost.community.ownerUser.updated_at,
                      ) satisfies string & tags.Format<"date-time"> as string &
                        tags.Format<"date-time">,
                      deletedAt:
                        reportedPost.community.ownerUser.deleted_at === null
                          ? null
                          : (toISOStringSafe(
                              reportedPost.community.ownerUser.deleted_at,
                            ) satisfies string &
                              tags.Format<"date-time"> as string &
                              tags.Format<"date-time">),
                    }
                  : null,
                createdAt: toISOStringSafe(
                  reportedPost.community.created_at,
                ) satisfies string & tags.Format<"date-time"> as string &
                  tags.Format<"date-time">,
                updatedAt: toISOStringSafe(
                  reportedPost.community.updated_at,
                ) satisfies string & tags.Format<"date-time"> as string &
                  tags.Format<"date-time">,
                deletedAt:
                  reportedPost.community.deleted_at === null
                    ? null
                    : (toISOStringSafe(
                        reportedPost.community.deleted_at,
                      ) satisfies string & tags.Format<"date-time"> as string &
                        tags.Format<"date-time">),
              },
              voteScore: undefined,
              commentCount: undefined,
            }
          : null,
        reportedComment: reportedComment
          ? {
              id: reportedComment.id,
              content: reportedComment.content ?? undefined,
              isDeleted: reportedComment.is_deleted,
              createdAt: reportedCommentCreatedAtString!,
              updatedAt: reportedCommentUpdatedAtString!,
              author: reportedComment.user
                ? {
                    id: reportedComment.user.id,
                    email: reportedComment.user.email,
                    username: reportedComment.user.username,
                    displayName: reportedComment.user.display_name,
                    bio: reportedComment.user.bio ?? undefined,
                    avatarUrl: reportedComment.user.avatar_url ?? undefined,
                    karma: reportedComment.user.karma,
                    createdAt: toISOStringSafe(
                      reportedComment.user.created_at,
                    ) satisfies string & tags.Format<"date-time"> as string &
                      tags.Format<"date-time">,
                    updatedAt: toISOStringSafe(
                      reportedComment.user.updated_at,
                    ) satisfies string & tags.Format<"date-time"> as string &
                      tags.Format<"date-time">,
                    deletedAt:
                      reportedComment.user.deleted_at === null
                        ? null
                        : (toISOStringSafe(
                            reportedComment.user.deleted_at,
                          ) satisfies string &
                            tags.Format<"date-time"> as string &
                            tags.Format<"date-time">),
                  }
                : null,
              parentId: reportedComment.parent_id ?? null,
              children: [],
            }
          : null,
      } satisfies ICommunityPlatformReportedContent.ISummary;
    }),
  };
}
