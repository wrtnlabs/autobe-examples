import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberCommunitiesCommunityIdReports(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  page?: number;
  limit?: number;
}): Promise<IPageIRedditPlatformReport.ISummary> {
  // Verify moderator role
  const moderator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        reddit_platform_member_id: props.member.id,
        reddit_platform_community_id: props.communityId,
        deleted_at: null,
      },
    });
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination parameters with defaults
  const currentPage = props.page ?? 1;
  const currentLimit = props.limit ?? 100;
  const skip = (currentPage - 1) * currentLimit;
  // Query reports
  const reports = await MyGlobal.prisma.reddit_platform_reports.findMany({
    where: {
      deleted_at: null,
      OR: [
        {
          post: {
            community_id: props.communityId,
          },
        },
        {
          comment: {
            post: {
              community_id: props.communityId,
            },
          },
        },
      ],
    },
    skip,
    take: currentLimit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
      reporter: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatarFile: {
            select: {
              id: true,
            },
          },
          karma_score: true,
          created_at: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
          post_type: true,
          text_content: true,
          url: true,
          author: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatarFile: {
                select: {
                  id: true,
                },
              },
              karma_score: true,
              created_at: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
              description: true,
              icon: {
                select: {
                  id: true,
                  file_name: true,
                  file_path: true,
                  content_type: true,
                  file_size: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              owner: {
                select: {
                  id: true,
                  username: true,
                  display_name: true,
                  avatarFile: {
                    select: {
                      id: true,
                    },
                  },
                  karma_score: true,
                  created_at: true,
                },
              },
              subscriber_count: true,
              created_at: true,
            },
          },
          file: {
            select: {
              id: true,
              file_name: true,
              file_path: true,
              content_type: true,
              file_size: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          votes: {
            select: {
              type: true,
            },
          },
          comments: {
            select: {
              id: true,
            },
          },
          created_at: true,
        },
      },
      comment: {
        select: {
          id: true,
          body: true,
          author: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatarFile: {
                select: {
                  id: true,
                },
              },
              karma_score: true,
              created_at: true,
            },
          },
          votes: {
            select: {
              vote_type: true,
            },
          },
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_platform_reports.count({
    where: {
      deleted_at: null,
      OR: [
        {
          post: {
            community_id: props.communityId,
          },
        },
        {
          comment: {
            post: {
              community_id: props.communityId,
            },
          },
        },
      ],
    },
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(reports, async (report) => {
    const vote_score = report.post
      ? report.post.votes.filter((v) => v.type === "upvote").length -
        report.post.votes.filter((v) => v.type === "downvote").length
      : report.comment
        ? report.comment.votes.reduce((sum, v) => sum + v.vote_type, 0)
        : 0;
    const comment_count = report.post ? report.post.comments.length : 0;
    let preview: string;
    if (report.post) {
      if (report.post.post_type === "text") {
        preview = report.post.text_content?.substring(0, 200) ?? "";
      } else if (report.post.post_type === "link") {
        try {
          const urlObj = new URL(report.post.url ?? "");
          preview = urlObj.hostname;
        } catch {
          preview = report.post.url ?? "";
        }
      } else if (report.post.post_type === "image") {
        preview = report.post.file?.file_path ?? "";
      } else {
        preview = "";
      }
    } else {
      preview = report.comment?.body?.substring(0, 200) ?? "";
    }
    return {
      id: report.id,
      reason: report.reason,
      status: report.status,
      reporter: {
        id: report.reporter.id,
        username: report.reporter.username,
        display_name: report.reporter.display_name ?? undefined,
        avatar_file_id: report.reporter.avatarFile?.id ?? undefined,
        karma_score: report.reporter.karma_score,
        created_at: toISOStringSafe(report.reporter.created_at),
      },
      post: report.post
        ? {
            id: report.post.id,
            title: report.post.title,
            author: {
              id: report.post.author.id,
              username: report.post.author.username,
              display_name: report.post.author.display_name ?? undefined,
              avatar_file_id: report.post.author.avatarFile?.id ?? undefined,
              karma_score: report.post.author.karma_score,
              created_at: toISOStringSafe(report.post.author.created_at),
            },
            community: {
              id: report.post.community.id,
              name: report.post.community.name,
              description: report.post.community.description ?? undefined,
              icon: report.post.community.icon
                ? {
                    id: report.post.community.icon.id,
                    fileName: report.post.community.icon.file_name,
                    filePath: report.post.community.icon.file_path,
                    contentType: report.post.community.icon.content_type,
                    fileSize: report.post.community.icon.file_size,
                    createdAt: toISOStringSafe(
                      report.post.community.icon.created_at,
                    ),
                    updatedAt: toISOStringSafe(
                      report.post.community.icon.updated_at,
                    ),
                    deletedAt: report.post.community.icon.deleted_at
                      ? toISOStringSafe(report.post.community.icon.deleted_at)
                      : null,
                  }
                : undefined,
              owner: {
                id: report.post.community.owner.id,
                username: report.post.community.owner.username,
                display_name:
                  report.post.community.owner.display_name ?? undefined,
                avatar_file_id:
                  report.post.community.owner.avatarFile?.id ?? undefined,
                karma_score: report.post.community.owner.karma_score,
                created_at: toISOStringSafe(
                  report.post.community.owner.created_at,
                ),
              },
              subscriber_count: report.post.community.subscriber_count,
              created_at: toISOStringSafe(report.post.community.created_at),
            },
            vote_score,
            comment_count,
            created_at: toISOStringSafe(report.post.created_at),
            post_type: report.post.post_type,
            preview,
          }
        : undefined,
      comment: report.comment
        ? {
            id: report.comment.id,
            body: report.comment.body,
            author: {
              id: report.comment.author.id,
              username: report.comment.author.username,
              display_name: report.comment.author.display_name ?? undefined,
              avatar_file_id: report.comment.author.avatarFile?.id ?? undefined,
              karma_score: report.comment.author.karma_score,
              created_at: toISOStringSafe(report.comment.author.created_at),
            },
            vote_score,
            created_at: toISOStringSafe(report.comment.created_at),
            updated_at: toISOStringSafe(report.comment.updated_at),
            deleted_at: report.comment.deleted_at
              ? toISOStringSafe(report.comment.deleted_at)
              : null,
          }
        : undefined,
      created_at: toISOStringSafe(report.created_at),
      updated_at: toISOStringSafe(report.updated_at),
    } satisfies IRedditPlatformReport.ISummary;
  });
  return {
    data,
    pagination: {
      current: currentPage,
      limit: currentLimit,
      records: total,
      pages: Math.ceil(total / currentLimit),
    },
  } satisfies IPageIRedditPlatformReport.ISummary;
}
