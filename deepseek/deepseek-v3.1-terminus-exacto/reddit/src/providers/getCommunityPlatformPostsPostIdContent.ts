import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTextContent";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostTextContentAtImageTransformer } from "../transformers/CommunityPlatformPostTextContentAtImageTransformer";
import { CommunityPlatformPostTextContentAtLinkTransformer } from "../transformers/CommunityPlatformPostTextContentAtLinkTransformer";
import { CommunityPlatformPostTextContentAtTextTransformer } from "../transformers/CommunityPlatformPostTextContentAtTextTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformPostsPostIdContent(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPost.IContent> {
  // Get the post to verify existence and determine content type
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId, deleted_at: null },
      select: { id: true, post_type: true },
    },
  );
  switch (post.post_type) {
    case "text":
      const textContent =
        await MyGlobal.prisma.community_platform_post_text_contents.findFirst({
          where: {
            community_platform_post_id: props.postId,
            deleted_at: null,
          },
          ...CommunityPlatformPostTextContentAtTextTransformer.select(),
        });
      if (!textContent) {
        throw new HttpException("Text content not found for this post", 404);
      }
      return await CommunityPlatformPostTextContentAtTextTransformer.transform(
        textContent,
      );
    case "link":
      const linkContent =
        await MyGlobal.prisma.community_platform_post_link_contents.findFirst({
          where: { community_platform_post_id: props.postId },
          ...CommunityPlatformPostTextContentAtLinkTransformer.select(),
        });
      if (!linkContent) {
        throw new HttpException("Link content not found for this post", 404);
      }
      return await CommunityPlatformPostTextContentAtLinkTransformer.transform(
        linkContent,
      );
    case "image":
      const imageContent =
        await MyGlobal.prisma.community_platform_post_image_contents.findFirst({
          where: { community_platform_post_id: props.postId },
          ...CommunityPlatformPostTextContentAtImageTransformer.select(),
        });
      if (!imageContent) {
        throw new HttpException("Image content not found for this post", 404);
      }
      return await CommunityPlatformPostTextContentAtImageTransformer.transform(
        imageContent,
      );
    default:
      throw new HttpException(`Invalid post_type: ${post.post_type}`, 400);
  }
}
