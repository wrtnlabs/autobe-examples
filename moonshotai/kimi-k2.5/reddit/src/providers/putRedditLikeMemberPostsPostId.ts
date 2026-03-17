import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImage";
import { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikePostTransformer } from "../transformers/RedditLikePostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeMemberPostsPostId(props: {
  member: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikePost.IUpdate;
}): Promise<IRedditLikePost> {
  // Fetch the existing post with all related content for snapshot and authorization
  const existingPost =
    await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: {
        id: true,
        author_id: true,
        community_id: true,
        title: true,
        post_type: true,
        vote_score: true,
        comment_count: true,
        is_deleted: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        textContent: {
          select: {
            id: true,
            body: true,
            excerpt: true,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.reddit_like_post_text_contentsFindManyArgs,
        linkContent: {
          select: {
            id: true,
            url: true,
            domain: true,
            preview_title: true,
            preview_description: true,
            preview_image_url: true,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.reddit_like_post_link_contentsFindManyArgs,
        imageContent: {
          select: {
            id: true,
            attachment: {
              select: {
                id: true,
                original_filename: true,
                mime_type: true,
                file_size_bytes: true,
                created_at: true,
                uploaded_by_member_id: true,
              },
            },
            thumbnail_attachment_id: true,
            thumbnail_generated: true,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.reddit_like_post_image_contentsFindManyArgs,
      },
    });
  // Authorization: member must be the post author
  if (existingPost.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Create snapshot before making any changes
  await MyGlobal.prisma.reddit_like_post_snapshots.create({
    data: {
      id: v4(),
      reddit_like_post_id: existingPost.id,
      title: existingPost.title,
      content_type: existingPost.post_type,
      author_id: existingPost.author_id,
      community_id: existingPost.community_id,
      vote_score: existingPost.vote_score,
      comment_count: existingPost.comment_count,
      is_deleted: existingPost.is_deleted,
      reddit_like_post_text_content_id: existingPost.textContent?.id ?? null,
      reddit_like_post_link_content_id: existingPost.linkContent?.id ?? null,
      reddit_like_post_image_content_id: existingPost.imageContent?.id ?? null,
      created_at: new Date(),
    },
  });
  // Update post title if provided
  if (props.body.title !== undefined) {
    await MyGlobal.prisma.reddit_like_posts.update({
      where: { id: props.postId },
      data: {
        title: props.body.title,
        updated_at: new Date(),
      },
    });
  }
  // Update type-specific content
  if (existingPost.post_type === "text" && props.body.body !== undefined) {
    await MyGlobal.prisma.reddit_like_post_text_contents.update({
      where: { post_id: props.postId },
      data: {
        body: props.body.body,
        updated_at: new Date(),
      },
    });
  } else if (
    existingPost.post_type === "link" &&
    props.body.url !== undefined
  ) {
    // Extract domain from URL for display
    const url = props.body.url;
    const domain = new URL(url).hostname;
    await MyGlobal.prisma.reddit_like_post_link_contents.update({
      where: { post_id: props.postId },
      data: {
        url: url,
        domain: domain,
        updated_at: new Date(),
      },
    });
  } else if (
    existingPost.post_type === "image" &&
    props.body.images !== undefined
  ) {
    // For image posts, delete existing images and create new ones
    await MyGlobal.prisma.reddit_like_post_images.deleteMany({
      where: { reddit_like_post_id: props.postId },
    });
    // Create new image entries
    for (const image of props.body.images) {
      await MyGlobal.prisma.reddit_like_post_images.create({
        data: {
          id: v4(),
          reddit_like_post_id: props.postId,
          reddit_like_attachment_id: image.attachmentId,
          display_order: image.displayOrder,
          created_at: new Date(),
        },
      });
    }
    // Update the post's updated_at timestamp for image changes
    await MyGlobal.prisma.reddit_like_posts.update({
      where: { id: props.postId },
      data: {
        updated_at: new Date(),
      },
    });
  }
  // Fetch updated post with transformer selection
  const updatedPost = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      ...RedditLikePostTransformer.select(),
    },
  );
  return await RedditLikePostTransformer.transform(updatedPost);
}
