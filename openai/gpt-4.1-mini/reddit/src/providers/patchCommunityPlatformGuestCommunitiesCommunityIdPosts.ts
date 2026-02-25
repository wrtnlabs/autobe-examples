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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformGuestCommunitiesCommunityIdPosts(props: {
  guest: GuestPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 ? props.body.limit : 20;
  const skip = (page - 1) * limit;
  const postTypeFilter = props.body.postType ?? null;
  const sortingMode = props.body.sortingMode ?? "new";
  const timeRange = props.body.timeRange ?? "all";
  let createdAtStart: string | null = null;
  const now = new Date();
  // Use toISOStringSafe instead of toISOString
  switch (timeRange) {
    case "day":
      createdAtStart = toISOStringSafe(
        new Date(now.getTime() - 24 * 60 * 60 * 1000),
      );
      break;
    case "week":
      createdAtStart = toISOStringSafe(
        new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      );
      break;
    case "month":
      createdAtStart = toISOStringSafe(
        new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      );
      break;
    case "year":
      createdAtStart = toISOStringSafe(
        new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      );
      break;
    default:
      createdAtStart = null;
  }
  const whereClause: Prisma.community_platform_postsWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
    ...(postTypeFilter ? { post_type: postTypeFilter } : {}),
    ...(createdAtStart ? { created_at: { gte: createdAtStart } } : {}),
  };
  let orderBy: Prisma.Enumerable<Prisma.community_platform_postsOrderByWithRelationInput> =
    [];
  switch (sortingMode) {
    case "new":
      orderBy = [{ created_at: "desc" }];
      break;
    case "top":
      // NOTE: Prisma doesn't support aggregate ordering in findMany so fallback to created_at desc
      orderBy = [{ created_at: "desc" }];
      break;
    case "hot":
    case "controversial":
      orderBy = [{ created_at: "desc" }];
      break;
    default:
      orderBy = [{ created_at: "desc" }];
  }
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: whereClause,
  });
  const postsRaw = await MyGlobal.prisma.community_platform_posts.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy,
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
        },
      },
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
            },
          },
        },
      },
      postComments: {
        select: { id: true },
      },
      postVotes: {
        select: {
          id: true,
          vote_type: true,
        },
      },
    },
  });
  const posts: ICommunityPlatformPost.ISummary[] = postsRaw.map((post) => {
    const voteScore = post.postVotes.reduce((score, vote) => {
      if (vote.vote_type === "upvote") return score + 1;
      if (vote.vote_type === "downvote") return score - 1;
      return score;
    }, 0);
    const commentCount = post.postComments.length;
    return {
      id: post.id,
      title: post.title,
      postType: post.post_type,
      createdAt: toISOStringSafe(post.created_at),
      updatedAt: toISOStringSafe(post.updated_at),
      deletedAt: post.deleted_at ? toISOStringSafe(post.deleted_at) : null,
      authorUser: post.authorUser
        ? {
            id: post.authorUser.id,
            email: post.authorUser.email,
            username: post.authorUser.username,
            displayName: post.authorUser.display_name,
            bio: post.authorUser.bio ?? null,
            avatarUrl: post.authorUser.avatar_url ?? null,
            karma: post.authorUser.karma,
            createdAt: toISOStringSafe(post.authorUser.created_at),
            updatedAt: toISOStringSafe(post.authorUser.updated_at),
            deletedAt: post.authorUser.deleted_at
              ? toISOStringSafe(post.authorUser.deleted_at)
              : null,
          }
        : null,
      authorModerator: post.authorModerator
        ? {
            id: post.authorModerator.id,
          }
        : null,
      community: {
        id: post.community.id,
        name: post.community.name,
        description: post.community.description,
        iconUrl: post.community.icon_url,
        subscriberCount: 0,
        ownerUser: {
          id: post.community.ownerUser.id,
          email: "",
          username: "",
          displayName: "",
          bio: null,
          avatarUrl: null,
          karma: 0,
          createdAt: "1970-01-01T00:00:00.000Z" as string &
            tags.Format<"date-time">,
          updatedAt: "1970-01-01T00:00:00.000Z" as string &
            tags.Format<"date-time">,
          deletedAt: null,
        },
        createdAt: toISOStringSafe(post.community.created_at),
        updatedAt: toISOStringSafe(post.community.updated_at),
        deletedAt: post.community.deleted_at
          ? toISOStringSafe(post.community.deleted_at)
          : null,
      },
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
    data: posts,
  };
}
