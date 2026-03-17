import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReportApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportApproval";
import { ICommunityPlatformReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDismissal";
import { ICommunityPlatformReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComment";
import { ICommunityPlatformReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformReportOfCommentTransformer {
  export type Payload = Prisma.community_platform_report_of_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select(): Prisma.community_platform_report_of_commentsFindManyArgs {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        comment: {
          select: {
            id: true,
            content: true,
            vote_score: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            author: {
              select: {
                id: true,
                name: true,
                avatar_url: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            post: {
              select: {
                id: true,
                title: true,
                content: true,
                vote_score: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            parent: {
              select: {
                id: true,
                content: true,
                vote_score: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                author: {
                  select: {
                    id: true,
                    name: true,
                    avatar_url: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                post: {
                  select: {
                    id: true,
                    title: true,
                    content: true,
                    vote_score: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
              },
            } satisfies Prisma.community_platform_commentsFindManyArgs,
          },
        } satisfies Prisma.community_platform_commentsFindManyArgs,
        contentReport: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            reason: true,
            status: true,
            resolved_at: true,
            resolved_by: {
              select: {
                id: true,
                name: true,
                avatar_url: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.community_platform_report_of_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformReportOfComment> {
    return {
      id: input.id,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      comment: {
        id: input.comment.id,
        content: input.comment.content,
        voteScore: input.comment.vote_score,
        createdAt: toISOStringSafe(input.comment.created_at),
        updatedAt: toISOStringSafe(input.comment.updated_at),
        deletedAt: input.comment.deleted_at
          ? toISOStringSafe(input.comment.deleted_at)
          : null,
        author: {
          id: input.comment.author.id,
          name: input.comment.author.name,
          avatarUrl: input.comment.author.avatar_url,
          createdAt: toISOStringSafe(input.comment.author.created_at),
          updatedAt: toISOStringSafe(input.comment.author.updated_at),
          deletedAt: input.comment.author.deleted_at
            ? toISOStringSafe(input.comment.author.deleted_at)
            : null,
        } satisfies ICommunityPlatformMember.ISummary,
        post: {
          id: input.comment.post.id,
          title: input.comment.post.title,
          content: input.comment.post.content,
          voteScore: input.comment.post.vote_score,
          createdAt: toISOStringSafe(input.comment.post.created_at),
          updatedAt: toISOStringSafe(input.comment.post.updated_at),
          deletedAt: input.comment.post.deleted_at
            ? toISOStringSafe(input.comment.post.deleted_at)
            : null,
        } satisfies ICommunityPlatformPost.ISummary,
        parent: input.comment.parent
          ? {
              id: input.comment.parent.id,
              content: input.comment.parent.content,
              voteScore: input.comment.parent.vote_score,
              createdAt: toISOStringSafe(input.comment.parent.created_at),
              updatedAt: toISOStringSafe(input.comment.parent.updated_at),
              deletedAt: input.comment.parent.deleted_at
                ? toISOStringSafe(input.comment.parent.deleted_at)
                : null,
              author: {
                id: input.comment.parent.author.id,
                name: input.comment.parent.author.name,
                avatarUrl: input.comment.parent.author.avatar_url,
                createdAt: toISOStringSafe(
                  input.comment.parent.author.created_at,
                ),
                updatedAt: toISOStringSafe(
                  input.comment.parent.author.updated_at,
                ),
                deletedAt: input.comment.parent.author.deleted_at
                  ? toISOStringSafe(input.comment.parent.author.deleted_at)
                  : null,
              } satisfies ICommunityPlatformMember.ISummary,
              post: {
                id: input.comment.parent.post.id,
                title: input.comment.parent.post.title,
                content: input.comment.parent.post.content,
                voteScore: input.comment.parent.post.vote_score,
                createdAt: toISOStringSafe(
                  input.comment.parent.post.created_at,
                ),
                updatedAt: toISOStringSafe(
                  input.comment.parent.post.updated_at,
                ),
                deletedAt: input.comment.parent.post.deleted_at
                  ? toISOStringSafe(input.comment.parent.post.deleted_at)
                  : null,
              } satisfies ICommunityPlatformPost.ISummary,
            }
          : null,
      } satisfies ICommunityPlatformComment.ISummary,
      contentReport: {
        id: input.contentReport.id,
        created_at: toISOStringSafe(input.contentReport.created_at),
        updated_at: toISOStringSafe(input.contentReport.updated_at),
        deleted_at: input.contentReport.deleted_at
          ? toISOStringSafe(input.contentReport.deleted_at)
          : null,
        reason: input.contentReport.reason,
        status: input.contentReport.status,
        resolved_at: input.contentReport.resolved_at
          ? toISOStringSafe(input.contentReport.resolved_at)
          : null,
        resolved_by: input.contentReport.resolved_by
          ? ({
              id: input.contentReport.resolved_by.id,
              name: input.contentReport.resolved_by.name,
              avatarUrl: input.contentReport.resolved_by.avatar_url,
              createdAt: toISOStringSafe(
                input.contentReport.resolved_by.created_at,
              ),
              updatedAt: toISOStringSafe(
                input.contentReport.resolved_by.updated_at,
              ),
              deletedAt: input.contentReport.resolved_by.deleted_at
                ? toISOStringSafe(input.contentReport.resolved_by.deleted_at)
                : null,
            } satisfies ICommunityPlatformMember.ISummary)
          : null,
      } satisfies ICommunityPlatformContentReport.ISummary,
    };
  }
}
