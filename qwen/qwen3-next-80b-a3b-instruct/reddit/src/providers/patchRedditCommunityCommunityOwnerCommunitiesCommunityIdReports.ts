import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunityOwnerCommunitiesCommunityIdReports(props: {
  communityOwner: CommunityownerPayload;
  communityId: string;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  // Validate that the communityId belongs to this logged-in owner
  const isOwner = await MyGlobal.prisma.reddit_community_community_owners.count(
    {
      where: {
        id: props.communityOwner.id,
      },
    },
  );
  if (isOwner === 0) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Time filter utility
  function getTimeFilterRange(): {
    gte?: Date;
    lte?: Date;
  } {
    const now = new Date();
    switch (props.body.timeFilter) {
      case "today":
        return {
          gte: new Date(now.setHours(0, 0, 0, 0)),
          lte: new Date(now.setHours(23, 59, 59, 999)),
        };
      case "week":
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        return { gte: weekStart, lte: weekEnd };
      case "month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { gte: monthStart, lte: monthEnd };
      case "year":
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearEnd = new Date(now.getFullYear(), 11, 31);
        return { gte: yearStart, lte: yearEnd };
      default:
        return {};
    }
  }
  const timeFilter = getTimeFilterRange();
  // Since reddit_community_reports connects to reports through join tables
  // We need to query the parent relationships via the join tables
  const whereClause: Prisma.reddit_community_reportsWhereInput = {
    deleted_at: null,
    reporter: { is_deleted: false },
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.search && {
      reason: { contains: props.body.search, mode: "insensitive" },
    }),
    ...timeFilter,
    OR: [
      {
        postReport: {
          comment: {
            post: {
              community_id: props.communityId,
            },
          },
        },
      },
      {
        commentReport: {
          comment: {
            post: {
              community_id: props.communityId,
            },
          },
        },
      },
    ],
  } satisfies Prisma.reddit_community_reportsWhereInput;
  const orderBy = (() => {
    switch (props.body.sort) {
      case "newest":
        return { created_at: "desc" };
      case "oldest":
        return { created_at: "asc" };
      case "most-reported":
        return { created_at: "desc" };
      default:
        return { created_at: "desc" };
    }
  })() satisfies Prisma.reddit_community_reportsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_community_reports.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy,
    include: {
      reporter: { select: { username: true } },
      resolver: { select: { username: true } },
      postReport: {
        select: {
          comment: {
            select: {
              post: {
                select: {
                  id: true,
                  title: true,
                  author_id: true,
                  community_id: true,
                  vote_score: true,
                  comment_count: true,
                  created_at: true,
                  updated_at: true,
                  url: true,
                  image_url: true,
                },
              },
            },
          },
        },
      },
      commentReport: {
        select: {
          comment: {
            select: {
              id: true,
              content: true,
              author_id: true,
              post_id: true,
              vote_score: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.reddit_community_reports.count({
    where: whereClause,
  });
  const transformedData = await Promise.all(
    data.map(async (report) => {
      let target_post_summary: IRedditCommunityPost.ISummary | null = null;
      let target_comment_summary: IRedditCommunityComment.ISummary | null =
        null;
      // Post report - traverse through postReport
      if (report.postReport) {
        const post = report.postReport.comment.post;
        const author =
          await MyGlobal.prisma.reddit_community_members.findUnique({
            where: { id: post.author_id },
          });
        const community =
          await MyGlobal.prisma.reddit_community_communities.findUnique({
            where: { id: post.community_id },
          });
        if (post && author && community) {
          target_post_summary = {
            id: post.id as string & tags.Format<"uuid">,
            title: post.title,
            author: {
              id: author.id as string & tags.Format<"uuid">,
              username: author.username,
              display_name: author.display_name,
              bio: author.bio,
              avatar_url: author.avatar_url,
              karma_score: author.karma_score,
              created_at: toISOStringSafe(author.created_at) as string &
                tags.Format<"date-time">,
            } satisfies IRedditCommunityMember.ISummary,
            community: {
              id: community.id as string & tags.Format<"uuid">,
              name: community.name,
              description: community.description,
              icon_url: community.icon_url,
              subscriber_count: 0, // Not available without join to subscriptions
              created_at: toISOStringSafe(community.created_at) as string &
                tags.Format<"date-time">,
              updated_at: toISOStringSafe(community.updated_at) as string &
                tags.Format<"date-time">,
            } satisfies IRedditCommunityCommunity.ISummary,
            voteScore: post.vote_score,
            commentCount: post.comment_count,
            createdAt: toISOStringSafe(post.created_at) as string &
              tags.Format<"date-time">,
            updatedAt: toISOStringSafe(post.updated_at) as string &
              tags.Format<"date-time">,
            url: post.url,
            imageUrl: post.image_url,
          } satisfies IRedditCommunityPost.ISummary;
        }
      }
      // Comment report - traverse through commentReport
      if (report.commentReport) {
        const comment = report.commentReport.comment;
        const author =
          await MyGlobal.prisma.reddit_community_members.findUnique({
            where: { id: comment.author_id },
          });
        const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
          where: { id: comment.post_id },
        });
        if (comment && author && post) {
          const community =
            await MyGlobal.prisma.reddit_community_communities.findUnique({
              where: { id: post.community_id },
            });
          target_comment_summary = {
            id: comment.id as string & tags.Format<"uuid">,
            content: comment.content,
            vote_score: comment.vote_score,
            created_at: toISOStringSafe(comment.created_at) as string &
              tags.Format<"date-time">,
            updated_at: toISOStringSafe(comment.updated_at) as string &
              tags.Format<"date-time">,
            author: {
              id: author.id as string & tags.Format<"uuid">,
              username: author.username,
              display_name: author.display_name,
              bio: author.bio,
              avatar_url: author.avatar_url,
              karma_score: author.karma_score,
              created_at: toISOStringSafe(author.created_at) as string &
                tags.Format<"date-time">,
            } satisfies IRedditCommunityMember.ISummary,
          } satisfies IRedditCommunityComment.ISummary;
        }
      }
      // Get reporter and resolver usernames
      const reporter_username = report.reporter_id
        ? ((
            await MyGlobal.prisma.reddit_community_members.findUnique({
              where: { id: report.reporter_id },
            })
          )?.username ?? "")
        : "";
      const resolved_by_username = report.resolved_by_user_id
        ? ((
            await MyGlobal.prisma.reddit_community_members.findUnique({
              where: { id: report.resolved_by_user_id },
            })
          )?.username ?? "")
        : "";
      return {
        id: report.id as string & tags.Format<"uuid">,
        reason: report.reason,
        status: report.status as "pending" | "approved" | "dismissed",
        created_at: toISOStringSafe(report.created_at) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(report.updated_at) as string &
          tags.Format<"date-time">,
        reporter_username,
        resolved_by_username,
        target_post_summary,
        target_comment_summary,
      } satisfies IRedditCommunityReport.ISummary;
    }),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditCommunityReport.ISummary;
}
