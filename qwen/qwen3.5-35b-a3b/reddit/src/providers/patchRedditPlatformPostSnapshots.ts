import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostSnapshot";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformPostSnapshots(props: {
  body: IRedditPlatformPostSnapshot.IRequest;
}): Promise<IPageIRedditPlatformPostSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_platform_post_snapshotsWhereInput = {
    ...(props.body.post_id !== undefined && {
      reddit_platform_post_id: props.body.post_id,
    }),
    ...(props.body.author_id !== undefined && {
      author_id: props.body.author_id,
    }),
    ...(props.body.snapshot_type !== undefined && {
      snapshot_type: props.body.snapshot_type,
    }),
    ...(props.body.start_date !== undefined && {
      created_at: {
        gte: props.body.start_date,
      },
    }),
    ...(props.body.end_date !== undefined && {
      created_at: {
        lte: props.body.end_date,
      },
    }),
  } satisfies Prisma.reddit_platform_post_snapshotsWhereInput;
  const orderByInput = (
    props.body.sort === "vote_score"
      ? { vote_score: (props.body.order ?? "DESC") as "asc" | "desc" }
      : { created_at: (props.body.order ?? "DESC") as "asc" | "desc" }
  ) satisfies Prisma.reddit_platform_post_snapshotsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_platform_post_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      title: true,
      content: true,
      post_type: true,
      url: true,
      image_url: true,
      vote_score: true,
      comment_count: true,
      snapshot_type: true,
      created_at: true,
      author_id: true,
      reddit_platform_post_id: true,
    } satisfies Prisma.reddit_platform_post_snapshotsSelect,
  });
  const total = await MyGlobal.prisma.reddit_platform_post_snapshots.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(data, async (snapshot) => {
      const [post, postAuthor, postCommunity, postCommunityOwner] =
        await Promise.all([
          MyGlobal.prisma.reddit_platform_posts.findUnique({
            where: { id: snapshot.reddit_platform_post_id },
            select: {
              id: true,
              title: true,
              post_type: true,
              vote_score: true,
              comment_count: true,
              created_at: true,
              deleted_at: true,
              reddit_platform_member_id: true,
              reddit_platform_community_id: true,
            } satisfies Prisma.reddit_platform_postsSelect,
          }),
          MyGlobal.prisma.reddit_platform_members.findUnique({
            where: { id: snapshot.author_id },
            select: {
              id: true,
              username: true,
              display_name: true,
              bio: true,
              avatar_url: true,
              karma_score: true,
              created_at: true,
            } satisfies Prisma.reddit_platform_membersSelect,
          }),
          MyGlobal.prisma.reddit_platform_communities.findUnique({
            where: { id: snapshot.reddit_platform_post_id },
            select: {
              id: true,
              name: true,
              description: true,
              icon_url: true,
              subscriber_count: true,
              created_at: true,
              owner_id: true,
            } satisfies Prisma.reddit_platform_communitiesSelect,
          }),
          MyGlobal.prisma.reddit_platform_members.findUnique({
            where: { id: (snapshot as any).__postCommunityOwnerId },
            select: {
              id: true,
              username: true,
              display_name: true,
              bio: true,
              avatar_url: true,
              karma_score: true,
              created_at: true,
            } satisfies Prisma.reddit_platform_membersSelect,
          }),
        ]);
      return {
        id: snapshot.id,
        title: snapshot.title,
        content: snapshot.content ?? undefined,
        postType: snapshot.post_type,
        url: snapshot.url ?? undefined,
        imageUrl: snapshot.image_url ?? undefined,
        voteScore: snapshot.vote_score,
        commentCount: snapshot.comment_count,
        snapshotType: snapshot.snapshot_type,
        createdAt: toISOStringSafe(snapshot.created_at),
        author: {
          id: postAuthor!.id,
          username: postAuthor!.username,
          displayName: postAuthor!.display_name,
          bio: postAuthor!.bio ?? null,
          avatarUrl: postAuthor!.avatar_url ?? null,
          karmaScore: postAuthor!.karma_score,
          createdAt: toISOStringSafe(postAuthor!.created_at),
          subscriptionCount: 0,
        } satisfies IRedditPlatformMember.ISummary,
        post: {
          id: post!.id,
          title: post!.title,
          post_type: post!.post_type,
          vote_score: post!.vote_score,
          comment_count: post!.comment_count,
          created_at: toISOStringSafe(post!.created_at),
          deleted_at: post!.deleted_at
            ? toISOStringSafe(post!.deleted_at)
            : null,
          author: {
            id: post!.reddit_platform_member_id,
            username: "",
            displayName: "",
            bio: null,
            avatarUrl: null,
            karmaScore: 0,
            createdAt: "",
            subscriptionCount: 0,
          } satisfies IRedditPlatformMember.ISummary,
          community: {
            id: postCommunity!.id,
            name: postCommunity!.name,
            description: postCommunity!.description ?? null,
            icon_url: postCommunity!.icon_url ?? null,
            subscriber_count: postCommunity!.subscriber_count,
            created_at: toISOStringSafe(postCommunity!.created_at),
            author: {
              id: postCommunity!.owner_id,
              username: "",
              displayName: "",
              bio: null,
              avatarUrl: null,
              karmaScore: 0,
              createdAt: "",
              subscriptionCount: 0,
            } satisfies IRedditPlatformMember.ISummary,
          } satisfies IRedditPlatformCommunity.ISummary,
        } satisfies IRedditPlatformPost.ISummary,
      };
    }),
  } satisfies IPageIRedditPlatformPostSnapshot.ISummary;
}
