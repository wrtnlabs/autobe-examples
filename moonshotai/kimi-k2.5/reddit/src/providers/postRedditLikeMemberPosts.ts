import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
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

export async function postRedditLikeMemberPosts(props: {
  member: AdminPayload;
  body: IRedditLikePost.ICreate;
}): Promise<IRedditLikePost> {
  // Verify community exists
  await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
    where: { id: props.body.community_id },
  });
  // Verify member is subscribed to the community
  const subscription =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findFirst({
      where: {
        member: { id: props.member.id },
        community: { id: props.body.community_id },
        deleted_at: null,
      },
    });
  if (subscription === null) {
    throw new HttpException(
      "Member must be subscribed to the community to create posts",
      403,
    );
  }
  // Determine post type from content fields
  const postType: "text" | "link" | "image" =
    props.body.post_type ??
    (props.body.body !== undefined
      ? "text"
      : props.body.url !== undefined
        ? "link"
        : props.body.attachment_id !== undefined
          ? "image"
          : "text");
  const now = new Date();
  const postId: string & tags.Format<"uuid"> = v4();
  // Create post with content in transaction
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create the main post record
    const post = await tx.reddit_like_posts.create({
      data: {
        id: postId,
        title: props.body.title,
        post_type: postType,
        vote_score: 0,
        comment_count: 0,
        is_deleted: false,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        author: { connect: { id: props.member.id } },
        community: { connect: { id: props.body.community_id } },
      },
    });
    // Create type-specific content
    if (postType === "text" && props.body.body !== undefined) {
      await tx.reddit_like_post_text_contents.create({
        data: {
          id: v4(),
          post_id: post.id,
          body: props.body.body,
          excerpt: props.body.excerpt ?? props.body.body.slice(0, 200),
          created_at: now,
          updated_at: now,
        },
      });
    } else if (postType === "link" && props.body.url !== undefined) {
      const domain = props.body.url.replace(/^https?:\/\//, "").split("/")[0];
      await tx.reddit_like_post_link_contents.create({
        data: {
          id: v4(),
          post_id: post.id,
          url: props.body.url,
          domain: domain,
          preview_title: null,
          preview_description: null,
          preview_image_url: null,
          created_at: now,
          updated_at: now,
        },
      });
    } else if (postType === "image" && props.body.attachment_id !== undefined) {
      await tx.reddit_like_post_image_contents.create({
        data: {
          id: v4(),
          post_id: post.id,
          attachment_id: props.body.attachment_id,
          thumbnail_attachment_id: null,
          thumbnail_generated: false,
          created_at: now,
          updated_at: now,
        },
      });
    }
    return post;
  });
  // Fetch complete post with all relations using transformer select
  const postWithRelations =
    await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
      where: { id: created.id },
      ...RedditLikePostTransformer.select(),
    });
  return await RedditLikePostTransformer.transform(postWithRelations);
}
