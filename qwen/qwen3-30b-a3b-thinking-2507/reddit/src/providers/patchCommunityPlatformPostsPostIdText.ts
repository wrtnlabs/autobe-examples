import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTextContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostTextContentTransformer } from "../transformers/CommunityPlatformPostTextContentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformPostsPostIdText(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostTextContent.IUpdate;
}): Promise<ICommunityPlatformPostTextContent> {
  // First, get the post text content with author information
  const postTextContent =
    await MyGlobal.prisma.community_platform_post_text_contents.findUnique({
      where: { id: props.postId },
      select: {
        id: true,
        content: true,
        preview: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: {
          select: {
            id: true,
            author: {
              select: { id: true },
            },
          },
        },
      },
    });
  // Verify post text content exists
  if (!postTextContent) {
    throw new HttpException("Post text content not found", 404);
  }
  // Validate content length constraint
  if (props.body.content.length < 1 || props.body.content.length > 2000) {
    throw new HttpException("Content must be between 1-2000 characters", 400);
  }
  // Calculate preview from content (first 200 characters)
  const preview = props.body.content.substring(0, 200);
  // Update the text content
  const updatedContent =
    await MyGlobal.prisma.community_platform_post_text_contents.update({
      where: { id: props.postId },
      data: {
        content: props.body.content,
        preview: preview,
        updated_at: toISOStringSafe(new Date()),
      },
      select: {
        id: true,
        content: true,
        preview: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: {
          select: {
            id: true,
            title: true,
            content_type: true,
            created_at: true,
            community: {
              select: {
                id: true,
                name: true,
                description: true,
                icon_url: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                owner: true,
              },
            },
            author: true,
            _count: {
              select: {
                community_platform_comments: true,
                community_platform_votes: true,
              },
            },
          },
        },
      },
    });
  // Transform the database record into the API response DTO
  return await CommunityPlatformPostTextContentTransformer.transform(
    updatedContent,
  );
}
