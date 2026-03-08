import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerator";
import { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
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

export async function patchRedditLikeAdminModerationActions(props: {
  admin: AdminPayload;
  body: IRedditLikeModerator.IRequest;
}): Promise<IPageIRedditLikeModerator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const banWhere: Prisma.reddit_like_bansWhereInput = {
    deleted_at: null,
    ...(props.body.community_id && {
      reddit_like_community_id: props.body.community_id,
    }),
    ...(props.body.user_id && {
      OR: [
        { reddit_like_user_id: props.body.user_id },
        { bannedUser: { id: props.body.user_id } },
      ],
    }),
    ...(props.body.created_at_from && {
      created_at: { gte: props.body.created_at_from },
    }),
    ...(props.body.created_at_to && {
      created_at: { lt: props.body.created_at_to },
    }),
  };
  const reportWhere: Prisma.reddit_like_reportsWhereInput = {
    deleted_at: null,
    ...(props.body.community_id && {
      OR: [
        { reportedPost: { community_id: props.body.community_id } },
        {
          reportedComment: { post: { community_id: props.body.community_id } },
        },
      ],
    }),
    ...(props.body.user_id && {
      OR: [
        { reporter_id: props.body.user_id },
        { reportedPost: { author_id: props.body.user_id } },
        { reportedComment: { author_id: props.body.user_id } },
      ],
    }),
    ...(props.body.created_at_from && {
      created_at: { gte: props.body.created_at_from },
    }),
    ...(props.body.created_at_to && {
      created_at: { lt: props.body.created_at_to },
    }),
  };
  const [bans, reports] = await Promise.all([
    MyGlobal.prisma.reddit_like_bans.findMany({
      where: banWhere,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        bannedUser: true,
        bannedCommunity: true,
      },
    }),
    MyGlobal.prisma.reddit_like_reports.findMany({
      where: reportWhere,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        reporter: true,
        reportedPost: { include: { author: true, community: true } },
        reportedComment: {
          include: {
            author: true,
            post: { include: { community: true, author: true } },
          },
        },
      },
    }),
  ]);
  const banActions = bans.map((ban) => ({
    id: ban.id as string & tags.Format<"uuid">,
    actionType: "ban" as const,
    timestamp: toISOStringSafe(ban.created_at),
    performer: {
      id: props.admin.id as string & tags.Format<"uuid">,
      username: "admin" as const,
      display_name: "Admin" as const,
    } satisfies IRedditLikeAdmin.ISummary,
    target: {
      id: ban.reddit_like_user_id as string & tags.Format<"uuid">,
      entity_type: "post" as const,
      title: ban.bannedUser.username,
      content: ban.bannedUser.bio ?? "",
      score: 0,
      hit_count: 0,
      created_at: toISOStringSafe(ban.bannedUser.created_at),
    } satisfies IRedditLikeMember.ISummary,
    community: {
      id: ban.reddit_like_community_id as string & tags.Format<"uuid">,
      name: ban.bannedCommunity.name,
      icon_url: ban.bannedCommunity.icon_url ?? null,
      created_at: toISOStringSafe(ban.bannedCommunity.created_at),
    } satisfies IRedditLikeCommunity.ISummary,
    status: ban.status as
      | "active"
      | "inactive"
      | "pending"
      | "approved"
      | "dismissed",
  }));
  const reportActions = reports.map((report) => ({
    id: report.id as string & tags.Format<"uuid">,
    actionType: "report" as const,
    timestamp: toISOStringSafe(report.created_at),
    performer: {
      id: props.admin.id as string & tags.Format<"uuid">,
      username: "admin" as const,
      display_name: "Admin" as const,
    } satisfies IRedditLikeAdmin.ISummary,
    target: report.reported_post_id
      ? ({
          id: report.reported_post_id as string & tags.Format<"uuid">,
          entity_type: "post" as const,
          title: report.reportedPost?.title ?? "",
          content: report.reportedPost?.content ?? "",
          score: report.reportedPost?.score ?? 0,
          hit_count: report.reportedPost?.comment_count ?? 0,
          created_at: toISOStringSafe(
            report.reportedPost?.created_at ?? new Date(),
          ),
          author: report.reportedPost?.author
            ? ({
                id: report.reportedPost.author.id as string &
                  tags.Format<"uuid">,
                entity_type: "post" as const,
                title: report.reportedPost.author.username,
                content: report.reportedPost.author.bio ?? "",
                score: 0,
                hit_count: 0,
                created_at: toISOStringSafe(
                  report.reportedPost.author.created_at,
                ),
              } satisfies IRedditLikeMember.ISummary)
            : undefined,
          community: report.reportedPost?.community
            ? ({
                id: report.reportedPost.community.id as string &
                  tags.Format<"uuid">,
                name: report.reportedPost.community.name,
                icon_url: report.reportedPost.community.icon_url ?? null,
                created_at: toISOStringSafe(
                  report.reportedPost.community.created_at,
                ),
              } satisfies IRedditLikeCommunity.ISummary)
            : undefined,
        } satisfies IRedditLikePost.ISummary)
      : report.reported_comment_id
        ? ({
            id: report.reported_comment_id as string & tags.Format<"uuid">,
            entity_type: "comment" as const,
            title: "Comment",
            content: report.reportedComment?.content ?? "",
            score: report.reportedComment?.vote_score ?? 0,
            hit_count: 0,
            created_at: toISOStringSafe(
              report.reportedComment?.created_at ?? new Date(),
            ),
            author: report.reportedComment?.author
              ? ({
                  id: report.reportedComment.author.id as string &
                    tags.Format<"uuid">,
                  entity_type: "post" as const,
                  title: report.reportedComment.author.username,
                  content: report.reportedComment.author.bio ?? "",
                  score: 0,
                  hit_count: 0,
                  created_at: toISOStringSafe(
                    report.reportedComment.author.created_at,
                  ),
                } satisfies IRedditLikeMember.ISummary)
              : undefined,
            post: report.reportedComment?.post
              ? ({
                  id: report.reportedComment.post.id as string &
                    tags.Format<"uuid">,
                  entity_type: "post" as const,
                  title: report.reportedComment.post.title,
                  content: report.reportedComment.post.content ?? "",
                  score: report.reportedComment.post.score ?? 0,
                  hit_count: report.reportedComment.post.comment_count ?? 0,
                  created_at: toISOStringSafe(
                    report.reportedComment.post.created_at,
                  ),
                  author: report.reportedComment.post.author
                    ? ({
                        id: report.reportedComment.post.author.id as string &
                          tags.Format<"uuid">,
                        entity_type: "post" as const,
                        title: report.reportedComment.post.author.username,
                        content: report.reportedComment.post.author.bio ?? "",
                        score: 0,
                        hit_count: 0,
                        created_at: toISOStringSafe(
                          report.reportedComment.post.author.created_at,
                        ),
                      } satisfies IRedditLikeMember.ISummary)
                    : undefined,
                  community: report.reportedComment.post.community
                    ? ({
                        id: report.reportedComment.post.community.id as string &
                          tags.Format<"uuid">,
                        name: report.reportedComment.post.community.name,
                        icon_url:
                          report.reportedComment.post.community.icon_url ??
                          null,
                        created_at: toISOStringSafe(
                          report.reportedComment.post.community.created_at,
                        ),
                      } satisfies IRedditLikeCommunity.ISummary)
                    : undefined,
                } satisfies IRedditLikePost.ISummary)
              : undefined,
          } satisfies IRedditLikeComment.ISummary)
        : undefined,
    community: report.reported_post_id
      ? ({
          id: report.reportedPost?.community.id as string & tags.Format<"uuid">,
          name: report.reportedPost?.community.name ?? "",
          icon_url: report.reportedPost?.community.icon_url ?? null,
          created_at: toISOStringSafe(
            report.reportedPost?.community.created_at ?? new Date(),
          ),
        } satisfies IRedditLikeCommunity.ISummary)
      : report.reported_comment_id
        ? ({
            id: report.reportedComment?.post.community.id as string &
              tags.Format<"uuid">,
            name: report.reportedComment?.post.community.name ?? "",
            icon_url: report.reportedComment?.post.community.icon_url ?? null,
            created_at: toISOStringSafe(
              report.reportedComment?.post.community.created_at ?? new Date(),
            ),
          } satisfies IRedditLikeCommunity.ISummary)
        : undefined,
    status: report.status as "pending" | "approved" | "dismissed",
  }));
  const allActions = [...banActions, ...reportActions];
  const filteredActions = props.body.action_type
    ? allActions.filter(
        (action) => action.actionType === props.body.action_type,
      )
    : allActions;
  const total = filteredActions.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  const pagedActions = filteredActions.slice(start, end);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: pagedActions,
  };
}
