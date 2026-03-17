import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostImageTransformer } from "../transformers/CommunityPlatformPostImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberPostsPostIdImagesImageId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostImage.IUpdate;
}): Promise<ICommunityPlatformPostImage> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const post = await prisma.community_platform_posts.findFirstOrThrow({
      where: {
        id: props.postId,
        deleted_at: null,
      },
      select: {
        id: true,
        community_platform_member_id: true,
        post_type: true,
      },
    });
    if (post.community_platform_member_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (post.post_type !== "image") {
      throw new HttpException("Post is not an image post", 400);
    }
    if (
      props.body.mime_type !== undefined &&
      props.body.mime_type.startsWith("image/") === false
    ) {
      throw new HttpException("Invalid media payload", 400);
    }
    const image = await prisma.community_platform_post_images.findFirstOrThrow({
      where: {
        id: props.imageId,
        deleted_at: null,
      },
      select: {
        id: true,
        community_platform_post_id: true,
      },
    });
    if (image.community_platform_post_id !== props.postId) {
      throw new HttpException(
        "Image does not belong to the specified post",
        400,
      );
    }
    await prisma.community_platform_post_images.update({
      where: {
        id: props.imageId,
      },
      data: {
        ...(props.body.storage_uri !== undefined
          ? { storage_uri: props.body.storage_uri }
          : {}),
        ...(props.body.original_name !== undefined
          ? { original_name: props.body.original_name }
          : {}),
        ...(props.body.mime_type !== undefined
          ? { mime_type: props.body.mime_type }
          : {}),
        ...(props.body.byte_size !== undefined
          ? { byte_size: props.body.byte_size }
          : {}),
        ...(props.body.width !== undefined ? { width: props.body.width } : {}),
        ...(props.body.height !== undefined
          ? { height: props.body.height }
          : {}),
        updated_at: new Date(),
      },
    });
    await prisma.community_platform_posts.update({
      where: {
        id: props.postId,
      },
      data: {
        updated_at: new Date(),
      },
    });
    const updated =
      await prisma.community_platform_post_images.findUniqueOrThrow({
        where: {
          id: props.imageId,
        },
        ...CommunityPlatformPostImageTransformer.select(),
      });
    return await CommunityPlatformPostImageTransformer.transform(updated);
  });
}
