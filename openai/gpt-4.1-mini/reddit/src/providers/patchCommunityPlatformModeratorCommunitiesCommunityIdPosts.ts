import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
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

export async function patchCommunityPlatformModeratorCommunitiesCommunityIdPosts(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  // Validate and normalize pagination parameters
  const page: number =
    props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit: number =
    props.body.limit && props.body.limit > 0 ? props.body.limit : 20;
  const skip: number = (page - 1) * limit;
  // Validate sortingMode
  const validSortingModes = ["new", "hot", "top", "controversial"] as const;
  const sortingMode: (typeof validSortingModes)[number] =
    (props.body.sortingMode as (typeof validSortingModes)[number]) ?? "new";
  if (!validSortingModes.includes(sortingMode)) {
    throw new HttpException("Invalid sortingMode", 400);
  }
  // Validate postType
  const postType: string | null = props.body.postType ?? null;
  // Validate and compute time range filter if applicable
  const validTimeRanges = ["day", "week", "month", "year", "all"] as const;
  const timeRange: (typeof validTimeRanges)[number] =
    (props.body.timeRange as (typeof validTimeRanges)[number]) ?? "all";
  if (!validTimeRanges.includes(timeRange)) {
    throw new HttpException("Invalid timeRange", 400);
  }
  // Compute threshold timestamp string using toISOStringSafe
  let timeThreshold: string | null = null;
  switch (timeRange) {
    case "day": {
      const d = new Date(Date.now() - 24 * 3600 * 1000);
      timeThreshold = toISOStringSafe(d);
      break;
    }
    case "week": {
      const d = new Date(Date.now() - 7 * 24 * 3600 * 1000);
      timeThreshold = toISOStringSafe(d);
      break;
    }
    case "month": {
      const d = new Date(Date.now() - 30 * 24 * 3600 * 1000);
      timeThreshold = toISOStringSafe(d);
      break;
    }
    case "year": {
      const d = new Date(Date.now() - 365 * 24 * 3600 * 1000);
      timeThreshold = toISOStringSafe(d);
      break;
    }
    case "all":
    default:
      timeThreshold = null;
  }
  // Construct base where filter for community posts
  const where: Prisma.community_platform_postsWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
  };
  if (postType !== null) {
    where.post_type = postType;
  }
  if (
    timeThreshold !== null &&
    (sortingMode === "hot" ||
      sortingMode === "top" ||
      sortingMode === "controversial")
  ) {
    where.created_at = { gte: new Date(timeThreshold) };
  }
  // Determine orderBy criteria based on sortingMode
  let orderBy: Prisma.Enumerable<Prisma.community_platform_postsOrderByWithRelationInput>;
  switch (sortingMode) {
    case "new":
      orderBy = [{ created_at: "desc" }];
      break;
    case "hot":
      orderBy = [{ created_at: "desc" }]; // Placeholder: real hot sorting needs aggregation
      break;
    case "top":
      orderBy = [{ created_at: "desc" }]; // Placeholder: real top sorting needs aggregation
      break;
    case "controversial":
      orderBy = [{ created_at: "desc" }]; // Placeholder: real controversial sorting needs aggregation
      break;
    default:
      orderBy = [{ created_at: "desc" }];
      break;
  }
  // Fetch posts with related author and community data plus votes and comments aggregation
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where,
    orderBy,
    skip,
    take: limit,
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
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
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
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      postVotes: {
        where: { deleted_at: null },
        select: { vote_type: true },
      },
      postComments: {
        where: { deleted_at: null },
        select: { id: true },
      },
    },
  });
  // Fetch total count
  const total = await MyGlobal.prisma.community_platform_posts.count({ where });
  // Transform posts data into DTO format
  const data: ICommunityPlatformPost.ISummary[] = posts.map((post) => {
    // Calculate voteScore
    const voteScore = post.postVotes.reduce((score, vote) => {
      if (vote.vote_type === "upvote") return score + 1;
      if (vote.vote_type === "downvote") return score - 1;
      return score;
    }, 0);
    // Calculate commentCount
    const commentCount = post.postComments.length;
    // Transform authorUser
    const authorUser =
      post.authorUser === null
        ? null
        : {
            id: post.authorUser.id,
            email: post.authorUser.email,
            username: post.authorUser.username,
            displayName: post.authorUser.display_name,
            bio: post.authorUser.bio === null ? null : post.authorUser.bio,
            avatarUrl:
              post.authorUser.avatar_url === null
                ? null
                : post.authorUser.avatar_url,
            karma: post.authorUser.karma,
            createdAt: (post.authorUser.created_at === null
              ? "1970-01-01T00:00:00.000Z"
              : toISOStringSafe(post.authorUser.created_at)) satisfies string &
              tags.Format<"date-time"> as string & tags.Format<"date-time">,
            updatedAt: (post.authorUser.updated_at === null
              ? "1970-01-01T00:00:00.000Z"
              : toISOStringSafe(post.authorUser.updated_at)) satisfies string &
              tags.Format<"date-time"> as string & tags.Format<"date-time">,
            deletedAt: (post.authorUser.deleted_at === null
              ? "1970-01-01T00:00:00.000Z"
              : toISOStringSafe(post.authorUser.deleted_at)) satisfies string &
              tags.Format<"date-time"> as string & tags.Format<"date-time">,
          };
    // Transform authorModerator
    const authorModerator =
      post.authorModerator === null
        ? null
        : {
            id: post.authorModerator.id,
            email: post.authorModerator.email,
            username: post.authorModerator.username,
            displayName: post.authorModerator.display_name,
            bio:
              post.authorModerator.bio === null
                ? null
                : post.authorModerator.bio,
            avatarUrl:
              post.authorModerator.avatar_url === null
                ? null
                : post.authorModerator.avatar_url,
            karma: post.authorModerator.karma,
            createdAt: (post.authorModerator.created_at === null
              ? "1970-01-01T00:00:00.000Z"
              : toISOStringSafe(
                  post.authorModerator.created_at,
                )) satisfies string & tags.Format<"date-time"> as string &
              tags.Format<"date-time">,
            updatedAt: (post.authorModerator.updated_at === null
              ? "1970-01-01T00:00:00.000Z"
              : toISOStringSafe(
                  post.authorModerator.updated_at,
                )) satisfies string & tags.Format<"date-time"> as string &
              tags.Format<"date-time">,
            deletedAt: (post.authorModerator.deleted_at === null
              ? "1970-01-01T00:00:00.000Z"
              : toISOStringSafe(
                  post.authorModerator.deleted_at,
                )) satisfies string & tags.Format<"date-time"> as string &
              tags.Format<"date-time">,
          };
    // Transform community owner user
    const communityOwnerUser = {
      id: post.community.ownerUser.id,
      email: post.community.ownerUser.email,
      username: post.community.ownerUser.username,
      displayName: post.community.ownerUser.display_name,
      bio:
        post.community.ownerUser.bio === null
          ? null
          : post.community.ownerUser.bio,
      avatarUrl:
        post.community.ownerUser.avatar_url === null
          ? null
          : post.community.ownerUser.avatar_url,
      karma: post.community.ownerUser.karma,
      createdAt: (post.community.ownerUser.created_at === null
        ? "1970-01-01T00:00:00.000Z"
        : toISOStringSafe(
            post.community.ownerUser.created_at,
          )) satisfies string & tags.Format<"date-time"> as string &
        tags.Format<"date-time">,
      updatedAt: (post.community.ownerUser.updated_at === null
        ? "1970-01-01T00:00:00.000Z"
        : toISOStringSafe(
            post.community.ownerUser.updated_at,
          )) satisfies string & tags.Format<"date-time"> as string &
        tags.Format<"date-time">,
      deletedAt: (post.community.ownerUser.deleted_at === null
        ? "1970-01-01T00:00:00.000Z"
        : toISOStringSafe(
            post.community.ownerUser.deleted_at,
          )) satisfies string & tags.Format<"date-time"> as string &
        tags.Format<"date-time">,
    };
    // Transform community
    const community = {
      id: post.community.id,
      name: post.community.name,
      description: post.community.description,
      iconUrl: post.community.icon_url,
      subscriberCount: 0, // Subscriber count requires separate query if needed
      ownerUser: communityOwnerUser,
      createdAt: (post.community.created_at === null
        ? "1970-01-01T00:00:00.000Z"
        : toISOStringSafe(post.community.created_at)) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      updatedAt: (post.community.updated_at === null
        ? "1970-01-01T00:00:00.000Z"
        : toISOStringSafe(post.community.updated_at)) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      deletedAt: (post.community.deleted_at === null
        ? "1970-01-01T00:00:00.000Z"
        : toISOStringSafe(post.community.deleted_at)) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
    };
    return {
      id: post.id,
      title: post.title,
      postType: post.post_type,
      createdAt: (post.created_at === null
        ? "1970-01-01T00:00:00.000Z"
        : toISOStringSafe(post.created_at)) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      updatedAt: (post.updated_at === null
        ? "1970-01-01T00:00:00.000Z"
        : toISOStringSafe(post.updated_at)) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      deletedAt: (post.deleted_at === null
        ? "1970-01-01T00:00:00.000Z"
        : toISOStringSafe(post.deleted_at)) satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
      authorUser,
      authorModerator,
      community,
      voteScore,
      commentCount,
    };
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
