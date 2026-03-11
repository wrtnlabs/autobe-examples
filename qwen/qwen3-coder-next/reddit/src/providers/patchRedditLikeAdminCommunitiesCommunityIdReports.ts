import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeAdminCommunitiesCommunityIdReports(props: {
  admin: AdminPayload;
  communityId: string;
  body: IRedditLikeReport.IRequest;
}): Promise<IPageIRedditLikeReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    AND: [
      {
        OR: [
          {
            reportedPost: {
              community_id: props.communityId,
            },
          },
          {
            reportedComment: {
              post: {
                community_id: props.communityId,
              },
            },
          },
        ],
      },
      ...(props.body.status ? [{ status: props.body.status }] : []),
    ],
  } satisfies Prisma.reddit_like_reportsWhereInput;
  const data = await MyGlobal.prisma.reddit_like_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    select: {
      id: true,
      reporter_id: true,
      reporter: {
        select: {
          id: true,
          username: true,
          display_name: true,
          bio: true,
          avatar_url: true,
          karma_score: true,
          created_at: true,
        },
      },
      reportedPost: {
        select: {
          id: true,
          title: true,
          type: true,
          content: true,
          url: true,
          image_url: true,
          score: true,
          comment_count: true,
          created_at: true,
          author: {
            select: {
              id: true,
              username: true,
              display_name: true,
              bio: true,
              avatar_url: true,
              karma_score: true,
              created_at: true,
            },
          },
          community: { select: { id: true, name: true, icon_url: true } },
        },
      },
      reportedComment: {
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
              username: true,
              display_name: true,
              bio: true,
              avatar_url: true,
              karma_score: true,
              created_at: true,
            },
          },
          parent_comment_id: true,
        },
      },
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_like_reports.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (record) =>
        ({
          id: record.id,
          reporter: {
            id: record.reporter.id,
            username: record.reporter.username,
            display_name: record.reporter.display_name,
            bio: record.reporter.bio ?? null,
            avatar_url:
              (record.reporter.avatar_url as string & tags.Format<"uri">) ??
              null,
            karma_score: record.reporter.karma_score,
            created_at: toISOStringSafe(record.reporter.created_at),
          } satisfies IRedditLikeMember.ISummary,
          reportedPost: record.reportedPost
            ? ({
                id: record.reportedPost.id,
                title: record.reportedPost.title,
                type: record.reportedPost.type as "text" | "link" | "image",
                content: record.reportedPost.content ?? null,
                url:
                  (record.reportedPost.url as string & tags.Format<"uri">) ??
                  null,
                imageUrl:
                  (record.reportedPost.image_url as string &
                    tags.Format<"uri">) ?? null,
                voteScore: record.reportedPost.score,
                commentCount: record.reportedPost.comment_count,
                createdAt: toISOStringSafe(record.reportedPost.created_at),
                author: {
                  id: record.reportedPost.author.id,
                  username: record.reportedPost.author.username,
                  display_name: record.reportedPost.author.display_name,
                  bio: record.reportedPost.author.bio ?? null,
                  avatar_url:
                    (record.reportedPost.author.avatar_url as string &
                      tags.Format<"uri">) ?? null,
                  karma_score: record.reportedPost.author.karma_score,
                  created_at: toISOStringSafe(
                    record.reportedPost.author.created_at,
                  ),
                } satisfies IRedditLikeMember.ISummary,
                community: {
                  name: record.reportedPost.community.name,
                  icon_url: record.reportedPost.community.icon_url ?? null,
                  subscriber_count: 0,
                } satisfies IRedditLikeCommunity.ISummary,
              } satisfies IRedditLikePost.ISummary)
            : null,
          reportedComment: record.reportedComment
            ? ({
                id: record.reportedComment.id,
                content: record.reportedComment.content,
                vote_score: record.reportedComment.vote_score,
                created_at: toISOStringSafe(record.reportedComment.created_at),
                updated_at: toISOStringSafe(record.reportedComment.updated_at),
                deleted_at: record.reportedComment.deleted_at
                  ? toISOStringSafe(record.reportedComment.deleted_at)
                  : null,
                author: {
                  id: record.reportedComment.author.id,
                  username: record.reportedComment.author.username,
                  display_name: record.reportedComment.author.display_name,
                  bio: record.reportedComment.author.bio ?? null,
                  avatar_url:
                    (record.reportedComment.author.avatar_url as string &
                      tags.Format<"uri">) ?? null,
                  karma_score: record.reportedComment.author.karma_score,
                  created_at: toISOStringSafe(
                    record.reportedComment.author.created_at,
                  ),
                } satisfies IRedditLikeMember.ISummary,
                parent_comment_id: record.reportedComment.parent_comment_id,
              } satisfies IRedditLikeComment.ISummary)
            : null,
          reason: record.reason,
          status: record.status,
          created_at: toISOStringSafe(record.created_at),
          updated_at: toISOStringSafe(record.updated_at),
          deleted_at: record.deleted_at
            ? toISOStringSafe(record.deleted_at)
            : null,
        }) satisfies IRedditLikeReport.ISummary,
    ),
  };
}
