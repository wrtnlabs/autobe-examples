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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdPosts(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const allowedPostTypes = ["text", "link", "image"];
  if (
    props.body.postType !== undefined &&
    props.body.postType !== null &&
    !allowedPostTypes.includes(props.body.postType)
  ) {
    throw new HttpException(`Invalid postType: ${props.body.postType}`, 400);
  }
  const allowedSortingModes = ["new", "hot", "top", "controversial"];
  if (
    props.body.sortingMode !== undefined &&
    props.body.sortingMode !== null &&
    !allowedSortingModes.includes(props.body.sortingMode)
  ) {
    throw new HttpException(
      `Invalid sortingMode: ${props.body.sortingMode}`,
      400,
    );
  }
  const allowedTimeRanges = ["day", "week", "month", "year", "all"];
  if (
    props.body.timeRange !== undefined &&
    props.body.timeRange !== null &&
    !allowedTimeRanges.includes(props.body.timeRange)
  ) {
    throw new HttpException(`Invalid timeRange: ${props.body.timeRange}`, 400);
  }
  const where: Prisma.community_platform_postsWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
  };
  if (props.body.postType) {
    where.post_type = props.body.postType;
  }
  if (props.body.timeRange && props.body.timeRange !== "all") {
    let fromISOString = "";
    switch (props.body.timeRange) {
      case "day":
        fromISOString = toISOStringSafe(
          new Date(Date.now() - 24 * 60 * 60 * 1000),
        );
        break;
      case "week":
        fromISOString = toISOStringSafe(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        );
        break;
      case "month":
        fromISOString = toISOStringSafe(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        );
        break;
      case "year":
        fromISOString = toISOStringSafe(
          new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        );
        break;
    }
    if (fromISOString) {
      where.created_at = { gte: fromISOString };
    }
  }
  let orderBy: Prisma.Enumerable<Prisma.community_platform_postsOrderByWithRelationInput>;
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
    default:
      orderBy = [{ created_at: "desc" }];
      break;
  }
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
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          owner_user_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.community_platform_posts.count({ where });
  const votes = await MyGlobal.prisma.community_platform_post_votes.groupBy({
    by: ["post_id", "vote_type"],
    where: { post_id: { in: posts.map((p) => p.id) } },
    _count: { vote_type: true },
  });
  const voteScoreMap: Record<string, number> = {};
  for (const vote of votes) {
    if (!(vote.post_id in voteScoreMap)) {
      voteScoreMap[vote.post_id] = 0;
    }
    if (vote.vote_type === "upvote") {
      voteScoreMap[vote.post_id] += vote._count?.vote_type ?? 0;
    } else if (vote.vote_type === "downvote") {
      voteScoreMap[vote.post_id] -= vote._count?.vote_type ?? 0;
    }
  }
  const comments =
    await MyGlobal.prisma.community_platform_post_comments.groupBy({
      by: ["post_id"],
      where: {
        post_id: { in: posts.map((p) => p.id) },
        deleted_at: null,
      },
      _count: { id: true },
    });
  const commentCountMap: Record<string, number> = {};
  for (const comment of comments) {
    commentCountMap[comment.post_id] = comment._count?.id ?? 0;
  }
  const ownerUserIds = Array.from(
    new Set(
      posts.flatMap((post) =>
        post.community.owner_user_id ? [post.community.owner_user_id] : [],
      ),
    ),
  );
  const owners = await MyGlobal.prisma.community_platform_users.findMany({
    where: { id: { in: ownerUserIds } },
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
  });
  const ownerMap: Record<string, ICommunityPlatformUser.ISummary> = {};
  for (const owner of owners) {
    ownerMap[owner.id] = {
      id: owner.id,
      email: owner.email,
      username: owner.username,
      displayName: owner.display_name,
      bio: owner.bio ?? null,
      avatarUrl: owner.avatar_url ?? null,
      karma: owner.karma,
      createdAt: toISOStringSafe(owner.created_at),
      updatedAt: toISOStringSafe(owner.updated_at),
      deletedAt: owner.deleted_at ? toISOStringSafe(owner.deleted_at) : null,
    };
  }
  const fallbackOwnerUser: ICommunityPlatformUser.ISummary = {
    id: "",
    email: "",
    username: "",
    displayName: "",
    bio: null,
    avatarUrl: null,
    karma: 0,
    createdAt: "1970-01-01T00:00:00.000Z" satisfies string &
      tags.Format<"date-time"> as string & tags.Format<"date-time">,
    updatedAt: "1970-01-01T00:00:00.000Z" satisfies string &
      tags.Format<"date-time"> as string & tags.Format<"date-time">,
    deletedAt: null,
  };
  const data = posts.map((post) => {
    const authorUser = post.authorUser
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
      : null;
    const authorModerator = post.authorModerator
      ? {
          id: post.authorModerator.id,
        }
      : null;
    const ownerUser = post.community.owner_user_id
      ? (ownerMap[post.community.owner_user_id] ?? fallbackOwnerUser)
      : fallbackOwnerUser;
    return {
      id: post.id,
      title: post.title,
      postType: props.body.postType ?? post.post_type,
      createdAt: toISOStringSafe(post.created_at),
      updatedAt: toISOStringSafe(post.updated_at),
      deletedAt: post.deleted_at ? toISOStringSafe(post.deleted_at) : null,
      authorUser,
      authorModerator,
      community: {
        id: post.community.id,
        name: post.community.name,
        description: post.community.description,
        iconUrl: post.community.icon_url,
        subscriberCount: 0,
        ownerUser: ownerUser,
        createdAt: toISOStringSafe(post.community.created_at),
        updatedAt: toISOStringSafe(post.community.updated_at),
        deletedAt: post.community.deleted_at
          ? toISOStringSafe(post.community.deleted_at)
          : null,
      },
      voteScore: voteScoreMap[post.id] ?? 0,
      commentCount: commentCountMap[post.id] ?? 0,
    };
  });
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
