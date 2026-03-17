import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostTransformer } from "../transformers/CommunityPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  const post = await MyGlobal.prisma.community_platform_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_platform_member_id: true,
      post_type: true,
      textContent: {
        select: {
          id: true,
        },
      } satisfies Prisma.community_platform_post_textsFindManyArgs,
      link: {
        select: {
          id: true,
        },
      } satisfies Prisma.community_platform_post_linksFindManyArgs,
      postImage: {
        select: {
          id: true,
        },
      } satisfies Prisma.community_platform_post_imagesFindManyArgs,
    },
  });
  if (post.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.title === undefined) {
    throw new HttpException("Title is required", 400);
  }
  if (
    post.post_type === "text" &&
    (props.body.target_url !== undefined || props.body.image !== undefined)
  ) {
    throw new HttpException("Invalid payload for text post", 400);
  }
  if (
    post.post_type === "link" &&
    (props.body.body !== undefined || props.body.image !== undefined)
  ) {
    throw new HttpException("Invalid payload for link post", 400);
  }
  if (
    post.post_type === "image" &&
    (props.body.body !== undefined || props.body.target_url !== undefined)
  ) {
    throw new HttpException("Invalid payload for image post", 400);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_posts.update({
      where: { id: props.postId },
      data: {
        title: props.body.title,
        updated_at: new Date(),
      },
    });
    if (post.post_type === "text") {
      if (post.textContent === null) {
        throw new HttpException("Internal Server Error", 500);
      }
      if (props.body.body === undefined) {
        throw new HttpException("Body is required for text post", 400);
      }
      await tx.community_platform_post_texts.update({
        where: { id: post.textContent.id },
        data: {
          body: props.body.body,
          updated_at: new Date(),
        },
      });
      return;
    }
    if (post.post_type === "link") {
      if (post.link === null) {
        throw new HttpException("Internal Server Error", 500);
      }
      if (props.body.target_url === undefined) {
        throw new HttpException("Target URL is required for link post", 400);
      }
      await tx.community_platform_post_links.update({
        where: { id: post.link.id },
        data: {
          target_url: props.body.target_url,
          domain_display: new URL(props.body.target_url).hostname,
          updated_at: new Date(),
        },
      });
      return;
    }
    if (post.post_type === "image") {
      if (post.postImage === null) {
        throw new HttpException("Internal Server Error", 500);
      }
      if (props.body.image === undefined) {
        throw new HttpException(
          "Image payload is required for image post",
          400,
        );
      }
      await tx.community_platform_post_images.update({
        where: { id: post.postImage.id },
        data: {
          ...(props.body.image.storage_uri !== undefined
            ? { storage_uri: props.body.image.storage_uri }
            : {}),
          ...(props.body.image.original_name !== undefined
            ? { original_name: props.body.image.original_name }
            : {}),
          ...(props.body.image.mime_type !== undefined
            ? { mime_type: props.body.image.mime_type }
            : {}),
          ...(props.body.image.byte_size !== undefined
            ? { byte_size: props.body.image.byte_size }
            : {}),
          ...(props.body.image.width !== undefined
            ? { width: props.body.image.width }
            : {}),
          ...(props.body.image.height !== undefined
            ? { height: props.body.image.height }
            : {}),
          updated_at: new Date(),
        },
      });
      return;
    }
    throw new HttpException("Invalid post type", 500);
  });
  const updated =
    await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
      where: {
        id: props.postId,
      },
      ...CommunityPlatformPostTransformer.select(),
    });
  return await CommunityPlatformPostTransformer.transform(updated);
}
