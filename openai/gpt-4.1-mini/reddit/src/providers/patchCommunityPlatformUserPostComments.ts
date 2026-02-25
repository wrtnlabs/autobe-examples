import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostComment";
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

export async function patchCommunityPlatformUserPostComments(props: {
  user: UserPayload;
  body: ICommunityPlatformPostComment.IRequest;
}): Promise<IPageICommunityPlatformPostComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.community_platform_post_commentsWhereInput = {
    deleted_at: null,
    ...(props.body.postId && { post_id: props.body.postId }),
    ...(props.body.userId && { user_id: props.body.userId }),
    ...(props.body.parentCommentId !== undefined && {
      parent_comment_id: props.body.parentCommentId,
    }),
    ...(props.body.search && {
      content_text: { contains: props.body.search, mode: "insensitive" },
    }),
  };
  const orderBy: Prisma.community_platform_post_commentsOrderByWithRelationInput =
    props.body.sort === "createdAtAsc"
      ? { created_at: "asc" }
      : props.body.sort === "createdAtDesc"
        ? { created_at: "desc" }
        : props.body.sort === "updatedAtAsc"
          ? { updated_at: "asc" }
          : { updated_at: "desc" };
  const commentsRaw =
    await MyGlobal.prisma.community_platform_post_comments.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        content_text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post_id: true,
        user_id: true,
        parent_comment_id: true,
      },
    });
  const postIds = [...new Set(commentsRaw.map((c) => c.post_id))];
  const userIds = [...new Set(commentsRaw.map((c) => c.user_id))];
  const parentCommentIds = commentsRaw
    .map((c) => c.parent_comment_id)
    .filter((pcid): pcid is string => pcid !== null && pcid !== undefined);
  const postsRaw = await MyGlobal.prisma.community_platform_posts.findMany({
    where: { id: { in: postIds }, deleted_at: null },
    select: {
      id: true,
      title: true,
      post_type: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      author_user_id: true,
      author_moderator_id: true,
      community_id: true,
    },
  });
  const postAuthorUserIds = postsRaw
    .filter((p) => p.author_user_id !== null)
    .map((p) => p.author_user_id as string);
  const postAuthorUsers =
    await MyGlobal.prisma.community_platform_users.findMany({
      where: { id: { in: postAuthorUserIds } },
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
  const postAuthorUserMap = new Map(postAuthorUsers.map((u) => [u.id, u]));
  const communityIds = [...new Set(postsRaw.map((p) => p.community_id))];
  const communitiesRaw =
    await MyGlobal.prisma.community_platform_communities.findMany({
      where: { id: { in: communityIds }, deleted_at: null },
      select: {
        id: true,
        name: true,
        description: true,
        icon_url: true,
        subscriber_count: true,
        owner_user_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const ownerUserIds = [...new Set(communitiesRaw.map((c) => c.owner_user_id))];
  const ownerUsers = await MyGlobal.prisma.community_platform_users.findMany({
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
  const ownerUserMap = new Map(ownerUsers.map((u) => [u.id, u]));
  const communityMap = new Map<
    string,
    (typeof communitiesRaw)[0] & {
      ownerUser: (typeof ownerUsers)[0] | null;
    }
  >();
  for (const community of communitiesRaw) {
    communityMap.set(community.id, {
      ...community,
      ownerUser: community.owner_user_id
        ? (ownerUserMap.get(community.owner_user_id) ?? null)
        : null,
    });
  }
  const authorsRaw = await MyGlobal.prisma.community_platform_users.findMany({
    where: { id: { in: userIds } },
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
  const authorMap = new Map(authorsRaw.map((user) => [user.id, user]));
  const parentCommentsRaw =
    await MyGlobal.prisma.community_platform_post_comments.findMany({
      where: { id: { in: parentCommentIds } },
      select: {
        id: true,
        content_text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post_id: true,
        user_id: true,
        parent_comment_id: true,
      },
    });
  const parentCommentMap = new Map<
    string,
    ICommunityPlatformPostComment.ISummary
  >();
  for (const pc of parentCommentsRaw) {
    parentCommentMap.set(pc.id, {
      id: pc.id,
      contentText: pc.content_text,
      createdAt: toISOStringSafe(pc.created_at),
      updatedAt: toISOStringSafe(pc.updated_at),
      deletedAt: pc.deleted_at ? toISOStringSafe(pc.deleted_at) : null,
      post: null,
      author: null,
      parentComment: null,
    });
  }
  const voteCountsRaw2 =
    await MyGlobal.prisma.community_platform_post_votes.groupBy({
      by: ["post_id"],
      where: { post_id: { in: postIds }, deleted_at: null },
      _sum: { value: true },
    });
  const voteCountsMap2 = voteCountsRaw2.reduce(
    (acc, cur) => {
      acc[cur.post_id] = cur._sum?.value ?? 0;
      return acc;
    },
    {} as Record<string, number>,
  );
  const commentCountResults2 =
    await MyGlobal.prisma.community_platform_post_comments.groupBy({
      by: ["post_id"],
      where: { post_id: { in: postIds }, deleted_at: null },
      _count: { _all: true },
    });
  const commentCountsMap2 = commentCountResults2.reduce(
    (acc, cur) => {
      acc[cur.post_id] = cur._count._all ?? 0;
      return acc;
    },
    {} as Record<string, number>,
  );
  const data: IPageICommunityPlatformPostComment.ISummary[] = [];
  for (const record of commentsRaw) {
    const postData = postsRaw.find((p) => p.id === record.post_id) ?? null;
    if (!postData) throw new HttpException("Post not found", 404);
    const authorUserData = postData.author_user_id
      ? (postAuthorUserMap.get(postData.author_user_id) ?? null)
      : null;
    const communityData = postData.community_id
      ? (communityMap.get(postData.community_id) ?? null)
      : null;
    const post: ICommunityPlatformPost.ISummary = {
      id: postData.id as string & tags.Format<"uuid">,
      title: postData.title,
      postType: postData.post_type,
      createdAt: toISOStringSafe(postData.created_at),
      updatedAt: toISOStringSafe(postData.updated_at),
      deletedAt: postData.deleted_at
        ? toISOStringSafe(postData.deleted_at)
        : null,
      authorUser: authorUserData
        ? ({
            id: authorUserData.id as string & tags.Format<"uuid">,
            email: authorUserData.email,
            username: authorUserData.username,
            displayName: authorUserData.display_name,
            bio: authorUserData.bio ?? null,
            avatarUrl: authorUserData.avatar_url ?? null,
            karma: authorUserData.karma,
            createdAt: toISOStringSafe(authorUserData.created_at),
            updatedAt: toISOStringSafe(authorUserData.updated_at),
            deletedAt: authorUserData.deleted_at
              ? toISOStringSafe(authorUserData.deleted_at)
              : null,
          } satisfies ICommunityPlatformUser.ISummary)
        : null,
      authorModerator: null,
      community: communityData
        ? ({
            id: communityData.id as string & tags.Format<"uuid">,
            name: communityData.name,
            description: communityData.description,
            iconUrl: communityData.icon_url,
            createdAt: toISOStringSafe(communityData.created_at),
            updatedAt: toISOStringSafe(communityData.updated_at),
            deletedAt: communityData.deleted_at
              ? toISOStringSafe(communityData.deleted_at)
              : null,
            subscriberCount: communityData.subscriber_count,
            ownerUser: communityData.ownerUser
              ? ({
                  id: communityData.ownerUser.id as string &
                    tags.Format<"uuid">,
                  email: communityData.ownerUser.email,
                  username: communityData.ownerUser.username,
                  displayName: communityData.ownerUser.display_name,
                  bio: communityData.ownerUser.bio ?? null,
                  avatarUrl: communityData.ownerUser.avatar_url ?? null,
                  karma: communityData.ownerUser.karma,
                  createdAt: toISOStringSafe(
                    communityData.ownerUser.created_at,
                  ),
                  updatedAt: toISOStringSafe(
                    communityData.ownerUser.updated_at,
                  ),
                  deletedAt: communityData.ownerUser.deleted_at
                    ? toISOStringSafe(communityData.ownerUser.deleted_at)
                    : null,
                } satisfies ICommunityPlatformUser.ISummary)
              : null,
          } satisfies ICommunityPlatformCommunity.ISummary)
        : null,
      voteScore: voteCountsMap2[postData.id] ?? 0,
      commentCount: commentCountsMap2[postData.id] ?? 0,
    };
    const authorData = authorMap.get(record.user_id) ?? null;
    if (authorData === null) {
      throw new HttpException("Author not found", 404);
    }
    const author: ICommunityPlatformUser.ISummary = {
      id: authorData.id as string & tags.Format<"uuid">,
      email: authorData.email,
      username: authorData.username,
      displayName: authorData.display_name,
      bio: authorData.bio ?? null,
      avatarUrl: authorData.avatar_url ?? null,
      karma: authorData.karma,
      createdAt: toISOStringSafe(authorData.created_at),
      updatedAt: toISOStringSafe(authorData.updated_at),
      deletedAt: authorData.deleted_at
        ? toISOStringSafe(authorData.deleted_at)
        : null,
    };
    const parentComment: ICommunityPlatformPostComment.ISummary | null =
      record.parent_comment_id
        ? (parentCommentMap.get(record.parent_comment_id) ?? {
            id: record.parent_comment_id,
            contentText: null,
            createdAt: null,
            updatedAt: null,
            deletedAt: null,
            post: null,
            author: null,
            parentComment: null,
          })
        : null;
    data.push({
      id: record.id as string & tags.Format<"uuid">,
      contentText: record.content_text,
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
      post,
      author,
      parentComment,
    });
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
