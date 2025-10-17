import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPlatformMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.ICreate;
}): Promise<ICommunityPlatformComment> {
  // 1. Verify member is active (not deleted) as part of authorization
  await MyGlobal.prisma.community_platform_member.findUniqueOrThrow({
    where: { id: props.member.id, deleted_at: null },
  });

  // 2. Find the target post to verify existence and get community
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
    },
  );

  // 3. Find the community's comment_review_mode setting
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: post.community_platform_community_id },
    });

  // 4. Create the comment using direct data assignment without Prisma type assertion
  const createdComment =
    await MyGlobal.prisma.community_platform_comments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_platform_post_id: props.postId,
        author_id: props.member.id,
        parent_comment_id: null,
        parent_post_snapshot_id: null,
        content: props.body.content,
        vote_count: 0,
        depth_level: 1,
        status: community.comment_review_mode ? "unreviewed" : "published",
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: undefined,
      },
    });

  // 5. Return the created comment with type mapping: ensure all dates use toISOStringSafe and handle null/undefined properly
  return {
    id: createdComment.id,
    created_at: toISOStringSafe(createdComment.created_at),
    author_id: createdComment.author_id,
    content: createdComment.content,
    vote_count: createdComment.vote_count,
    status: createdComment.status as
      | "published"
      | "unreviewed"
      | "removed"
      | "archived",
    updated_at: createdComment.updated_at
      ? toISOStringSafe(createdComment.updated_at)
      : undefined,
    deleted_at: createdComment.deleted_at
      ? toISOStringSafe(createdComment.deleted_at)
      : undefined,
    community_platform_post_id: createdComment.community_platform_post_id,
    parent_comment_id:
      createdComment.parent_comment_id === null
        ? undefined
        : createdComment.parent_comment_id,
    parent_post_snapshot_id:
      createdComment.parent_post_snapshot_id === null
        ? undefined
        : createdComment.parent_post_snapshot_id,
    depth_level: createdComment.depth_level,
  } satisfies ICommunityPlatformComment;
}
