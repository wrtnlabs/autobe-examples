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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikePostTransformer } from "../transformers/RedditLikePostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikePost.IUpdate;
}): Promise<IRedditLikePost> {
  // Fetch post and verify ownership
  const post = await MyGlobal.prisma.reddit_like_posts.findUnique({
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
      textContent: {
        select: {
          id: true,
          body: true,
          excerpt: true,
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
        },
      } satisfies Prisma.reddit_like_post_link_contentsFindManyArgs,
    },
  });
  if (post === null || post.is_deleted) {
    throw new HttpException("Post not found", 404);
  }
  if (post.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Create snapshot before update for audit trail
  await MyGlobal.prisma.reddit_like_post_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_like_post_id: post.id,
      title: post.title,
      content_type: post.post_type,
      reddit_like_post_text_content_id: post.textContent?.id ?? null,
      reddit_like_post_link_content_id: post.linkContent?.id ?? null,
      reddit_like_post_image_content_id: null,
      author_id: post.author_id,
      community_id: post.community_id,
      vote_score: post.vote_score,
      comment_count: post.comment_count,
      is_deleted: post.is_deleted,
      created_at: new Date(),
    },
  });
  // Track if any update occurs to set updated_at
  let needsTimestampUpdate = false;
  // Update post title if provided
  if (props.body.title !== undefined) {
    await MyGlobal.prisma.reddit_like_posts.update({
      where: { id: props.postId },
      data: {
        title: props.body.title,
        updated_at: new Date(),
      },
    });
    needsTimestampUpdate = true;
  }
  // Update type-specific content
  if (
    post.post_type === "text" &&
    props.body.body !== undefined &&
    post.textContent !== null
  ) {
    const excerpt =
      props.body.body.length > 200
        ? props.body.body.slice(0, 200) + "..."
        : props.body.body;
    await MyGlobal.prisma.reddit_like_post_text_contents.update({
      where: { id: post.textContent.id },
      data: {
        body: props.body.body,
        excerpt: excerpt,
        updated_at: new Date(),
      },
    });
    needsTimestampUpdate = true;
  } else if (
    post.post_type === "link" &&
    props.body.url !== undefined &&
    post.linkContent !== null
  ) {
    const domain = new URL(props.body.url).hostname;
    await MyGlobal.prisma.reddit_like_post_link_contents.update({
      where: { id: post.linkContent.id },
      data: {
        url: props.body.url,
        domain: domain,
        updated_at: new Date(),
      },
    });
    needsTimestampUpdate = true;
  } else if (post.post_type === "image" && props.body.images !== undefined) {
    // Delete existing images and recreate with new configuration
    await MyGlobal.prisma.reddit_like_post_images.deleteMany({
      where: { reddit_like_post_id: props.postId },
    });
    // Create new image entries
    for (const image of props.body.images) {
      await MyGlobal.prisma.reddit_like_post_images.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          reddit_like_post_id: props.postId,
          reddit_like_attachment_id: image.attachmentId,
          display_order: image.displayOrder,
          created_at: new Date(),
        },
      });
    }
    needsTimestampUpdate = true;
  }
  // Update timestamp if content was updated but title wasn't
  if (needsTimestampUpdate && props.body.title === undefined) {
    await MyGlobal.prisma.reddit_like_posts.update({
      where: { id: props.postId },
      data: {
        updated_at: new Date(),
      },
    });
  }
  // Fetch and return updated post using transformer
  const updatedPost = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      ...RedditLikePostTransformer.select(),
    },
  );
  return RedditLikePostTransformer.transform(updatedPost);
}
