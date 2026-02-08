import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function putCommunityPlatformUserPostsPostId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    include: {
      community: true,
      authorUser: true,
      authorModerator: true,
      postTexts: true,
      postLink: true,
      postImages: true,
    },
  });
  if (post === null) throw new HttpException("Post not found", 404);
  const isAuthorUser =
    post.authorUser !== null && post.authorUser.id === props.user.id;
  const isAuthorModerator =
    post.authorModerator !== null && post.authorModerator.id === props.user.id;
  if (!isAuthorUser && !isAuthorModerator) {
    throw new HttpException("Forbidden", 403);
  }
  const validPostTypes = ["text", "link", "image"] as const;
  if (!validPostTypes.includes((props.body as any).post_type)) {
    throw new HttpException(
      `Invalid post_type: ${(props.body as any).post_type}`,
      400,
    );
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_posts.update({
      where: { id: props.postId },
      data: {
        title: (props.body as any).title,
        post_type: (props.body as any).post_type,
        updated_at: toISOStringSafe(new Date())!,
      },
    });
    if ((props.body as any).post_type === "text") {
      if (post.postTexts.length > 0) {
        await tx.community_platform_post_texts.updateMany({
          where: { community_platform_post_id: props.postId },
          data: {
            content: (props.body as any).content ?? "",
            updated_at: toISOStringSafe(new Date())!,
          },
        });
      } else {
        await tx.community_platform_post_texts.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            community_platform_post_id: props.postId,
            content: (props.body as any).content ?? "",
            created_at: toISOStringSafe(new Date())!,
            updated_at: toISOStringSafe(new Date())!,
            deleted_at: null,
          },
        });
      }
      await tx.community_platform_post_links.deleteMany({
        where: { community_platform_post_id: props.postId },
      });
      await tx.community_platform_post_images.deleteMany({
        where: { community_platform_post_id: props.postId },
      });
    } else if ((props.body as any).post_type === "link") {
      if (post.postLink !== null) {
        await tx.community_platform_post_links.update({
          where: { id: post.postLink.id },
          data: {
            url: (props.body as any).url ?? "",
            updated_at: toISOStringSafe(new Date())!,
          },
        });
      } else {
        await tx.community_platform_post_links.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            community_platform_post_id: props.postId,
            url: (props.body as any).url ?? "",
            created_at: toISOStringSafe(new Date())!,
            updated_at: toISOStringSafe(new Date())!,
            deleted_at: null,
          },
        });
      }
      await tx.community_platform_post_texts.deleteMany({
        where: { community_platform_post_id: props.postId },
      });
      await tx.community_platform_post_images.deleteMany({
        where: { community_platform_post_id: props.postId },
      });
    } else if ((props.body as any).post_type === "image") {
      await tx.community_platform_post_images.deleteMany({
        where: { community_platform_post_id: props.postId },
      });
      for (const img of (props.body as any).images ?? []) {
        await tx.community_platform_post_images.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            community_platform_post_id: props.postId,
            image_url: img.image_url,
            created_at: toISOStringSafe(new Date())!,
            updated_at: toISOStringSafe(new Date())!,
            deleted_at: null,
          },
        });
      }
      await tx.community_platform_post_texts.deleteMany({
        where: { community_platform_post_id: props.postId },
      });
      await tx.community_platform_post_links.deleteMany({
        where: { community_platform_post_id: props.postId },
      });
    }
    return await tx.community_platform_posts.findUnique({
      where: { id: props.postId },
      include: {
        community: true,
        authorUser: true,
        authorModerator: true,
        postTexts: true,
        postLink: true,
        postImages: true,
      },
    });
  });
  if (updated === null) throw new HttpException("Failed to update post", 500);
  return {
    id: updated.id,
    title: updated.title,
    post_type: updated.post_type,
    community_id: updated.community_id,
    author_user_id: updated.author_user_id ?? null,
    author_moderator_id: updated.author_moderator_id ?? null,
    created_at: toISOStringSafe(updated.created_at)!,
    updated_at: toISOStringSafe(updated.updated_at)!,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    community: updated.community,
    authorUser: updated.authorUser ?? null,
    authorModerator: updated.authorModerator ?? null,
    postTexts: updated.postTexts.map((text) => ({
      id: text.id,
      community_platform_post_id: text.community_platform_post_id,
      content: text.content,
      created_at: toISOStringSafe(text.created_at)!,
      updated_at: toISOStringSafe(text.updated_at)!,
      deleted_at: text.deleted_at ? toISOStringSafe(text.deleted_at) : null,
    })),
    postLink: updated.postLink
      ? {
          id: updated.postLink.id,
          community_platform_post_id:
            updated.postLink.community_platform_post_id,
          url: updated.postLink.url,
          created_at: toISOStringSafe(updated.postLink.created_at)!,
          updated_at: toISOStringSafe(updated.postLink.updated_at)!,
          deleted_at: updated.postLink.deleted_at
            ? toISOStringSafe(updated.postLink.deleted_at)
            : null,
        }
      : null,
    postImages: updated.postImages.map((img) => ({
      id: img.id,
      community_platform_post_id: img.community_platform_post_id,
      image_url: img.image_url,
      created_at: toISOStringSafe(img.created_at)!,
      updated_at: toISOStringSafe(img.updated_at)!,
      deleted_at: img.deleted_at ? toISOStringSafe(img.deleted_at) : null,
    })),
  };
}
