import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  // Fetch the post to verify existence and ownership
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
    },
  );

  // Verify the post belongs to the authenticated user
  if (post.author_id !== props.member.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own posts",
      403,
    );
  }

  // Prepare update data with satisfies for proper type handling
  const updateData = {
    title: props.body.title,
    content: props.body.content,
    updated_at: toISOStringSafe(new Date()),
  } satisfies Prisma.community_platform_postsUpdateInput;

  // Update the post
  const updatedPost = await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: updateData,
    select: {
      id: true,
      community_platform_community_id: true,
      author_id: true,
      title: true,
      content: true,
      post_type: true,
      vote_count: true,
      comment_count: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  // Fetch related data (image_url or link_url) if they exist
  const relatedData = await Promise.all([
    post.post_type === "image"
      ? MyGlobal.prisma.community_platform_post_images.findUnique({
          where: { community_platform_post_id: props.postId },
          select: { image_url: true },
        })
      : Promise.resolve(null),
    post.post_type === "link"
      ? MyGlobal.prisma.community_platform_post_links.findUnique({
          where: { community_platform_post_id: props.postId },
          select: { url: true },
        })
      : Promise.resolve(null),
  ]);

  // Construct the response with satisfies for type safety
  const response = {
    id: updatedPost.id,
    community_platform_community_id:
      updatedPost.community_platform_community_id,
    author_id: updatedPost.author_id,
    title: updatedPost.title,
    content: updatedPost.content || undefined,
    post_type: updatedPost.post_type as "link" | "text" | "image",
    vote_count: updatedPost.vote_count,
    comment_count: updatedPost.comment_count,
    status: updatedPost.status as
      | "published"
      | "unreviewed"
      | "removed"
      | "archived",
    created_at: toISOStringSafe(updatedPost.created_at),
    updated_at: toISOStringSafe(updatedPost.updated_at),
    deleted_at: updatedPost.deleted_at
      ? toISOStringSafe(updatedPost.deleted_at)
      : undefined,
    image_url: relatedData[0] ? relatedData[0].image_url : undefined,
    link_url: relatedData[1] ? relatedData[1].url : undefined,
  } satisfies ICommunityPlatformPost;

  return response;
}
