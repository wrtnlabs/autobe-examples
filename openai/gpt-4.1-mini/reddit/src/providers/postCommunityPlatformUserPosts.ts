import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostCollector } from "../collectors/CommunityPlatformPostCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserPosts(props: {
  user: UserPayload;
  body: ICommunityPlatformPost.ICreate;
}): Promise<ICommunityPlatformPost> {
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findFirst({
      where: { community_id: props.body.communityId, user_id: props.user.id },
    });
  if (subscription === null) {
    throw new HttpException("User is not subscribed to the community.", 403);
  }
  const ban =
    await MyGlobal.prisma.community_platform_community_banned_users.findFirst({
      where: {
        community_id: props.body.communityId,
        user_id: props.user.id,
        unbanned_at: null,
      },
    });
  if (ban !== null) {
    throw new HttpException("User is banned from the community.", 403);
  }
  const validPostTypes = ["text", "link", "image"] as const;
  if (!validPostTypes.includes(props.body.post_type)) {
    throw new HttpException("Invalid post_type.", 400);
  }
  const postCreateInput = await CommunityPlatformPostCollector.collect({
    body: {
      communityId: props.body.communityId,
      title: props.body.title,
      post_type: props.body.post_type,
      authorUserId: props.user.id,
      authorModeratorId: null,
    },
  });
  const createdPost = await MyGlobal.prisma.$transaction(async (tx) => {
    const post = await tx.community_platform_posts.create({
      data: postCreateInput,
    });
    if (props.body.post_type === "text") {
      await tx.community_platform_post_texts.create({
        data: {
          id: v4(),
          post: { connect: { id: post.id } },
          content: props.body.text_content!,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
      });
    } else if (props.body.post_type === "link") {
      await tx.community_platform_post_links.create({
        data: {
          id: v4(),
          post: { connect: { id: post.id } },
          url: props.body.link_url!,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
      });
    } else if (props.body.post_type === "image") {
      for (const url of props.body.image_urls ?? []) {
        await tx.community_platform_post_images.create({
          data: {
            id: v4(),
            post: { connect: { id: post.id } },
            image_url: url,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
          },
        });
      }
    }
    return post;
  });
  const fullPost = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: createdPost.id },
    select: {
      id: true,
      community_id: true,
      author_user_id: true,
      author_moderator_id: true,
      title: true,
      post_type: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      community: { select: { id: true, name: true } },
      authorUser: { select: { id: true, display_name: true } },
      authorModerator: { select: { id: true, display_name: true } },
      postTexts: { select: { content: true } },
      postLink: { select: { url: true } },
      postImages: {
        select: { image_url: true },
        orderBy: { created_at: "asc" },
      },
    },
  });
  if (fullPost === null) {
    throw new HttpException("Failed to fetch created post.", 500);
  }
  return {
    id: createdPost.id,
    community_id: fullPost.community_id,
    author_user_id: fullPost.author_user_id ?? undefined,
    author_moderator_id: fullPost.author_moderator_id ?? undefined,
    title: fullPost.title,
    post_type: fullPost.post_type,
    created_at: toISOStringSafe(fullPost.created_at),
    updated_at: toISOStringSafe(fullPost.updated_at),
    deleted_at:
      fullPost.deleted_at === null
        ? null
        : toISOStringSafe(fullPost.deleted_at),
    community: {
      id: fullPost.community.id,
      name: fullPost.community.name,
    },
    authorUser:
      fullPost.authorUser === null
        ? null
        : {
            id: fullPost.authorUser.id,
            display_name: fullPost.authorUser.display_name,
          },
    authorModerator:
      fullPost.authorModerator === null
        ? null
        : {
            id: fullPost.authorModerator.id,
            display_name: fullPost.authorModerator.display_name,
          },
    community_platform_post_text:
      fullPost.postTexts === null
        ? null
        : { content: fullPost.postTexts.content },
    community_platform_post_link:
      fullPost.postLink === null ? null : { url: fullPost.postLink.url },
    community_platform_post_images:
      fullPost.postImages.length === 0
        ? []
        : await ArrayUtil.asyncMap(fullPost.postImages, async (image) => ({
            url: image.image_url,
          })),
  };
}
