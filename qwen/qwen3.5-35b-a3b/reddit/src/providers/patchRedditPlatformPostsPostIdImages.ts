import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformPostsPostIdImages(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditPlatformPostImage.IRequest;
}): Promise<IRedditPlatformPostImage.ISummary> {
  const operation = props.body.operation;
  // 1. Verify post exists and is IMAGE type
  const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
      post_type: "IMAGE",
    },
    select: {
      id: true,
      title: true,
      post_type: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
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
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          subscriber_count: true,
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
          created_at: true,
        },
      },
    },
  });
  // 2. Verify authorization (author or community moderator)
  const customer: any = props as any;
  const sessionMemberId = customer.session_id;
  const session =
    await MyGlobal.prisma.reddit_platform_member_sessions.findUniqueOrThrow({
      where: { id: sessionMemberId },
      select: { member_id: true },
    });
  const member =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: session.member_id },
      select: { id: true },
    });
  const isAuthor = member.id === post.author.id;
  let isModerator = false;
  if (!isAuthor) {
    const community =
      await MyGlobal.prisma.reddit_platform_communities.findFirstOrThrow({
        where: { id: post.community.id },
        select: { id: true, deleted_at: true },
      });
    if (community.deleted_at !== null) {
      throw new HttpException("Community not found", 404);
    }
    const moderator =
      await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
        where: {
          community_id: post.community.id,
          user_id: member.id,
          deleted_at: null,
        },
      });
    isModerator = !!moderator;
  }
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Handle operation
  switch (operation) {
    case "retrieve": {
      const images = await MyGlobal.prisma.reddit_platform_post_images.findMany(
        {
          where: {
            post_id: props.postId,
            deleted_at: null,
          },
          orderBy: { created_at: "asc" },
        },
      );
      if (images.length === 0) {
        throw new HttpException("No images found", 404);
      }
      return images.map((img) => ({
        id: img.id,
        post: {
          id: post.id,
          title: post.title,
          post_type: post.post_type,
          vote_score: post.vote_score,
          comment_count: post.comment_count,
          author: {
            id: post.author.id,
            username: post.author.username,
            displayName: post.author.display_name,
            bio: post.author.bio,
            avatarUrl: post.author.avatar_url,
            karmaScore: post.author.karma_score,
            createdAt: post.author.created_at.toISOString(),
            subscriptionCount: 0,
          } satisfies IRedditPlatformMember.ISummary,
          community: {
            id: post.community.id,
            name: post.community.name,
            description: post.community.description,
            icon_url: post.community.icon_url,
            subscriber_count: post.community.subscriber_count,
            author: {
              id: post.community.author.id,
              username: post.community.author.username,
              displayName: post.community.author.display_name,
              bio: post.community.author.bio,
              avatarUrl: post.community.author.avatar_url,
              karmaScore: post.community.author.karma_score,
              createdAt: post.community.author.created_at.toISOString(),
              subscriptionCount: 0,
            } satisfies IRedditPlatformMember.ISummary,
            created_at: post.community.created_at.toISOString(),
          } satisfies IRedditPlatformCommunity.ISummary,
          created_at: post.created_at.toISOString(),
          deleted_at: post.deleted_at?.toISOString() ?? null,
        } satisfies IRedditPlatformPost.ISummary,
        created_at: img.created_at.toISOString(),
        updated_at: img.updated_at.toISOString(),
        filename: img.filename,
        mime_type: img.mime_type,
        file_size: img.file_size,
        file_path: img.file_path,
        deleted_at: img.deleted_at?.toISOString() ?? null,
      }))[0];
    }
    case "upload": {
      const { mime_type, file_size, filename } = props.body.upload;
      const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!allowedMimeTypes.includes(mime_type)) {
        throw new HttpException("Invalid file format", 400);
      }
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file_size > MAX_FILE_SIZE) {
        throw new HttpException("File too large", 400);
      }
      const existingCount =
        await MyGlobal.prisma.reddit_platform_post_images.count({
          where: {
            post_id: props.postId,
            deleted_at: null,
          },
        });
      if (existingCount >= 5) {
        throw new HttpException("Too many images", 400);
      }
      const imageId: string & tags.Format<"uuid"> = v4();
      const created = await MyGlobal.prisma.reddit_platform_post_images.create({
        data: {
          id: imageId,
          post_id: props.postId,
          filename: filename,
          mime_type: mime_type,
          file_size: file_size,
          file_path: `uploads/posts/${props.postId}/${imageId}`,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
      return {
        id: created.id,
        post: {
          id: post.id,
          title: post.title,
          post_type: post.post_type,
          vote_score: post.vote_score,
          comment_count: post.comment_count,
          author: {
            id: post.author.id,
            username: post.author.username,
            displayName: post.author.display_name,
            bio: post.author.bio,
            avatarUrl: post.author.avatar_url,
            karmaScore: post.author.karma_score,
            createdAt: post.author.created_at.toISOString(),
            subscriptionCount: 0,
          } satisfies IRedditPlatformMember.ISummary,
          community: {
            id: post.community.id,
            name: post.community.name,
            description: post.community.description,
            icon_url: post.community.icon_url,
            subscriber_count: post.community.subscriber_count,
            author: {
              id: post.community.author.id,
              username: post.community.author.username,
              displayName: post.community.author.display_name,
              bio: post.community.author.bio,
              avatarUrl: post.community.author.avatar_url,
              karmaScore: post.community.author.karma_score,
              createdAt: post.community.author.created_at.toISOString(),
              subscriptionCount: 0,
            } satisfies IRedditPlatformMember.ISummary,
            created_at: post.community.created_at.toISOString(),
          } satisfies IRedditPlatformCommunity.ISummary,
          created_at: post.created_at.toISOString(),
          deleted_at: post.deleted_at?.toISOString() ?? null,
        } satisfies IRedditPlatformPost.ISummary,
        created_at: created.created_at.toISOString(),
        updated_at: created.updated_at.toISOString(),
        filename: created.filename,
        mime_type: created.mime_type,
        file_size: created.file_size,
        file_path: created.file_path,
        deleted_at: created.deleted_at?.toISOString() ?? null,
      };
    }
    case "remove": {
      const imageId = props.body.remove.image_id;
      const image =
        await MyGlobal.prisma.reddit_platform_post_images.findFirstOrThrow({
          where: {
            id: imageId,
            post_id: props.postId,
            deleted_at: null,
          },
        });
      await MyGlobal.prisma.reddit_platform_post_images.update({
        where: { id: imageId },
        data: { deleted_at: new Date() },
      });
      const updated =
        await MyGlobal.prisma.reddit_platform_post_images.findUnique({
          where: { id: imageId },
        });
      if (!updated) {
        throw new HttpException("Image not found", 404);
      }
      return {
        id: updated.id,
        post: {
          id: post.id,
          title: post.title,
          post_type: post.post_type,
          vote_score: post.vote_score,
          comment_count: post.comment_count,
          author: {
            id: post.author.id,
            username: post.author.username,
            displayName: post.author.display_name,
            bio: post.author.bio,
            avatarUrl: post.author.avatar_url,
            karmaScore: post.author.karma_score,
            createdAt: post.author.created_at.toISOString(),
            subscriptionCount: 0,
          } satisfies IRedditPlatformMember.ISummary,
          community: {
            id: post.community.id,
            name: post.community.name,
            description: post.community.description,
            icon_url: post.community.icon_url,
            subscriber_count: post.community.subscriber_count,
            author: {
              id: post.community.author.id,
              username: post.community.author.username,
              displayName: post.community.author.display_name,
              bio: post.community.author.bio,
              avatarUrl: post.community.author.avatar_url,
              karmaScore: post.community.author.karma_score,
              createdAt: post.community.author.created_at.toISOString(),
              subscriptionCount: 0,
            } satisfies IRedditPlatformMember.ISummary,
            created_at: post.community.created_at.toISOString(),
          } satisfies IRedditPlatformCommunity.ISummary,
          created_at: post.created_at.toISOString(),
          deleted_at: post.deleted_at?.toISOString() ?? null,
        } satisfies IRedditPlatformPost.ISummary,
        created_at: updated.created_at.toISOString(),
        updated_at: updated.updated_at.toISOString(),
        filename: updated.filename,
        mime_type: updated.mime_type,
        file_size: updated.file_size,
        file_path: updated.file_path,
        deleted_at: updated.deleted_at?.toISOString() ?? null,
      };
    }
    default:
      throw new HttpException("Invalid operation", 400);
  }
}
