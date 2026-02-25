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
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserCommunitiesCommunityIdPosts(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const validPostTypes = ["text", "link", "image"];
  const validSortingModes = ["new", "hot", "top", "controversial"];
  const validTimeRanges = ["day", "week", "month", "year", "all"];
  if (
    props.body.postType !== undefined &&
    props.body.postType !== null &&
    !validPostTypes.includes(props.body.postType)
  ) {
    throw new HttpException("Invalid postType filter", 400);
  }
  if (
    props.body.sortingMode !== undefined &&
    props.body.sortingMode !== null &&
    !validSortingModes.includes(props.body.sortingMode)
  ) {
    throw new HttpException("Invalid sortingMode filter", 400);
  }
  if (
    props.body.timeRange !== undefined &&
    props.body.timeRange !== null &&
    !validTimeRanges.includes(props.body.timeRange)
  ) {
    throw new HttpException("Invalid timeRange filter", 400);
  }
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.user.id,
        deleted_at: null,
      },
    });
  if (!subscription) {
    throw new HttpException("User is not subscribed to the community", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  let createdAtFilter: Prisma.DateTimeFilter | undefined;
  if (props.body.timeRange && props.body.timeRange !== "all") {
    let sinceDateTime: string & tags.Format<"date-time">;
    switch (props.body.timeRange) {
      case "day":
        sinceDateTime = toISOStringSafe(new Date(Date.now() - 86400000));
        break;
      case "week":
        sinceDateTime = toISOStringSafe(new Date(Date.now() - 7 * 86400000));
        break;
      case "month": {
        const d = new Date();
        d.setUTCMonth(d.getUTCMonth() - 1);
        sinceDateTime = toISOStringSafe(d);
        break;
      }
      case "year": {
        const d = new Date();
        d.setUTCFullYear(d.getUTCFullYear() - 1);
        sinceDateTime = toISOStringSafe(d);
        break;
      }
      default:
        sinceDateTime = toISOStringSafe(new Date());
    }
    createdAtFilter = { gte: sinceDateTime };
  }
  const whereClause: Prisma.community_platform_postsWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
    ...(props.body.postType ? { post_type: props.body.postType } : {}),
    ...(createdAtFilter ? { created_at: createdAtFilter } : {}),
  };
  let orderBy: Prisma.Enumerable<Prisma.community_platform_postsOrderByWithRelationInput> =
    [{ created_at: "desc" }];
  if (props.body.sortingMode) {
    switch (props.body.sortingMode) {
      case "new":
        orderBy = [{ created_at: "desc" }];
        break;
      case "top":
        orderBy = [{ created_at: "desc" }];
        break;
      case "hot":
      case "controversial":
        orderBy = [{ created_at: "desc" }];
        break;
    }
  }
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
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
          owner_user_id: true,
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
      postVotes: {
        select: { id: true },
      },
      postComments: {
        select: { id: true },
      },
    },
  });
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: whereClause,
  });
  const data: ICommunityPlatformPost.ISummary[] = posts.map((post) => {
    const voteScoreCount = post.postVotes.length;
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
            email: post.authorModerator.email,
            username: post.authorModerator.username,
            displayName: post.authorModerator.display_name ?? null,
            bio: post.authorModerator.bio ?? null,
            avatarUrl: post.authorModerator.avatar_url ?? null,
            karma: post.authorModerator.karma,
            createdAt: toISOStringSafe(post.authorModerator.created_at),
            updatedAt: toISOStringSafe(post.authorModerator.updated_at),
            deletedAt: post.authorModerator.deleted_at
              ? toISOStringSafe(post.authorModerator.deleted_at)
              : null,
          }
        : null,
      community: {
        id: post.community.id,
        name: post.community.name,
        description: post.community.description,
        iconUrl: post.community.icon_url,
        createdAt: toISOStringSafe(post.community.created_at),
        updatedAt: toISOStringSafe(post.community.updated_at),
        deletedAt: post.community.deleted_at
          ? toISOStringSafe(post.community.deleted_at)
          : null,
        subscriberCount: 0,
        ownerUser: post.community.ownerUser
          ? {
              id: post.community.ownerUser.id,
              email: post.community.ownerUser.email,
              username: post.community.ownerUser.username,
              displayName: post.community.ownerUser.display_name,
              bio: post.community.ownerUser.bio ?? null,
              avatarUrl: post.community.ownerUser.avatar_url ?? null,
              karma: post.community.ownerUser.karma,
              createdAt: toISOStringSafe(post.community.ownerUser.created_at),
              updatedAt: toISOStringSafe(post.community.ownerUser.updated_at),
              deletedAt: post.community.ownerUser.deleted_at
                ? toISOStringSafe(post.community.ownerUser.deleted_at)
                : null,
            }
          : {
              id: "" as string & tags.Format<"uuid">,
              email: "",
              username: "",
              displayName: "",
              bio: null,
              avatarUrl: null,
              karma: 0,
              createdAt: "",
              updatedAt: "",
              deletedAt: null,
            },
      },
      voteScore: voteScoreCount,
      commentCount: commentCount,
    };
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data,
  };
}
