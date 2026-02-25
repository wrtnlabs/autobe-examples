import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneGuestAnalyticsPostsTop(props: {
  guest: GuestPayload;
  body: IRedditCloneContentPost.IRequest;
}): Promise<IPageIRedditCloneContentPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Determine time filter range
  let startTime: string | undefined;
  if (props.body.timeFilter) {
    const now = new Date();
    switch (props.body.timeFilter) {
      case "today":
        startTime = toISOStringSafe(
          new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        );
        break;
      case "week":
        startTime = toISOStringSafe(
          new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        );
        break;
      case "month":
        startTime = toISOStringSafe(
          new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
        );
        break;
      case "year":
        startTime = toISOStringSafe(
          new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
        );
        break;
      case "allTime":
        startTime = undefined;
        break;
    }
  }
  // Build where clause
  const whereClause: Prisma.reddit_clone_content_postsWhereInput = startTime
    ? {
        created_at: {
          gte: startTime,
        },
      }
    : {};
  // Fetch posts with pagination
  const data = await MyGlobal.prisma.reddit_clone_content_posts.findMany({
    where: whereClause,
    skip,
    take: limit + 1, // Fetch one extra to determine if there are more pages
    orderBy: [{ vote_score: "desc" }, { created_at: "desc" }],
    select: {
      id: true,
      title: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      author: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          subscriber_count: true,
          created_at: true,
          owner: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar_url: true,
            },
          },
        },
      },
    },
  });
  // Calculate total for pagination
  const total = await MyGlobal.prisma.reddit_clone_content_posts.count({
    where: whereClause,
  });
  // Process results with proper date formatting and structure
  const formattedData: IRedditCloneContentPost.ISummary[] = data.map(
    (record) => {
      // Calculate relative time
      const timeAgo = calculateTimeAgo(record.created_at);
      return {
        id: record.id as string & tags.Format<"uuid">,
        title: record.title,
        author: {
          id: record.author.id as string & tags.Format<"uuid">,
          username: record.author.username,
          displayName:
            record.author.display_name === null
              ? undefined
              : record.author.display_name,
          avatarUrl:
            record.author.avatar_url === null
              ? undefined
              : record.author.avatar_url,
        } satisfies IRedditCloneMember.ISummary,
        community: {
          id: record.community.id as string & tags.Format<"uuid">,
          name: record.community.name,
          description:
            record.community.description === null
              ? undefined
              : record.community.description,
          iconUrl:
            record.community.icon_url === null
              ? undefined
              : (record.community.icon_url as string & tags.Format<"uri">),
          subscriberCount: record.community.subscriber_count,
          createdAt: toISOStringSafe(record.community.created_at) as string &
            tags.Format<"date-time">,
          owner: {
            id: record.community.owner.id as string & tags.Format<"uuid">,
            username: record.community.owner.username,
            displayName:
              record.community.owner.display_name === null
                ? undefined
                : record.community.owner.display_name,
            avatarUrl:
              record.community.owner.avatar_url === null
                ? undefined
                : record.community.owner.avatar_url,
          } satisfies IRedditCloneOwner.ISummary,
        } satisfies IRedditCloneCommunity.ISummary,
        voteScore: record.vote_score,
        commentCount: record.comment_count,
        timeAgo: timeAgo,
        created_at: toISOStringSafe(record.created_at) as string &
          tags.Format<"date-time">,
        viewCount: 0,
        upvoteCount: 0,
        downvoteCount: 0,
        trendingScore: 0,
        engagementRate: 0,
      };
    },
  );
  // Determine pagination details
  const hasMore = data.length > limit;
  const totalPages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: hasMore ? formattedData.slice(0, limit) : formattedData,
  };
}
// Helper function to calculate relative time
function calculateTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  if (years > 0) return years === 1 ? "1 year ago" : `${years} years ago`;
  if (months > 0) return months === 1 ? "1 month ago" : `${months} months ago`;
  if (days > 0) return days === 1 ? "1 day ago" : `${days} days ago`;
  if (hours > 0) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  if (minutes > 0)
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  return "just now";
}
