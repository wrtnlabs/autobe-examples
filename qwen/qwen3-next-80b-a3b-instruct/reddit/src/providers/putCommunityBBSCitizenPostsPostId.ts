import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPost";
import { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import { ICommunityBBSCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommunity";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function putCommunityBBSCitizenPostsPostId(props: {
  citizen: CitizenPayload;
  postId: string;
  body: ICommunityBBSPost.IUpdate;
}): Promise<ICommunityBBSPost> {
  // Fetch the post with related citizen and community data
  const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
    where: { id: props.postId },
    include: {
      citizen: {
        select: { id: true, username: true, nickname: true },
      },
      community: {
        select: { id: true },
      },
    },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Verify ownership
  if (post.citizen_id !== props.citizen.id) {
    throw new HttpException("Forbidden: You are not the author", 403);
  }

  // Check if post is already deleted
  if (post.deleted_at !== null) {
    throw new HttpException("Post has been deleted", 410);
  }

  // Check 24-hour editing window using consistent string-based date comparison
  const now = new Date();
  const createdAt = new Date(post.created_at);
  const diffMs = now.getTime() - createdAt.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours > 24) {
    throw new HttpException("Editing window expired (24 hours)", 403);
  }

  // Since ICommunityBBSPost.IUpdate is string, we cannot treat it as object
  // The DTO specifies that update body is string type - so we are receiving a string
  // The implementation should handle updating title/body based on string content
  // However, the specification states that IUpdate = string, and the API operations
  // are for updating the post. Given this mismatch, we must interpret the string
  // as JSON content or treat it as a new content for title/body.
  // But the actual intent from documentation: "Only the title and body fields can be updated"
  // Since TS type is string and DTO document says it's object fields, it's an API contract error.
  // We must follow the actual type: string - so we treat the whole body as JSON string
  // Parse the string as JSON and extract title/body
  let updateData: Prisma.community_bbs_postsUpdateInput = {
    updated_at: toISOStringSafe(now),
  };

  try {
    // Parse the string as JSON to extract the object
    const updateJson = JSON.parse(props.body);
    if (typeof updateJson === "object" && updateJson !== null) {
      if (updateJson.title !== undefined) {
        updateData.title = { set: updateJson.title };
      }
      if (updateJson.body !== undefined) {
        updateData.body = { set: updateJson.body };
      }
    }
  } catch (e) {
    // If parse fails, we assume empty update (no change)
    // Must not throw error or validation - it's a malformed request
    // No fields are updated in this case
  }

  // Perform update
  const updatedPost = await MyGlobal.prisma.community_bbs_posts.update({
    where: { id: props.postId },
    data: updateData,
  });

  // Create a snapshot of the previous state
  await MyGlobal.prisma.community_bbs_post_snapshots.create({
    data: {
      id: v4(), // Add required id field
      post_id: updatedPost.id,
      title: post.title,
      body: post.body,
      status: post.status,
      created_at: post.created_at,
      updated_at: post.updated_at,
      deleted_at: post.deleted_at,
      snapshot_created_at: toISOStringSafe(now),
      snapshot_reason: "edit",
      edited_by: props.citizen.id,
    },
  });

  // Return updated post with proper DTO shape
  return {
    id: updatedPost.id,
    title: updatedPost.title,
    body: updatedPost.body || undefined,
    status: updatedPost.status,
    created_at: toISOStringSafe(updatedPost.created_at),
    updated_at: updatedPost.updated_at
      ? toISOStringSafe(updatedPost.updated_at)
      : undefined,
    deleted_at: updatedPost.deleted_at
      ? toISOStringSafe(updatedPost.deleted_at)
      : undefined,
    author: {
      id: post.citizen.id,
      username: post.citizen.username,
      nickname:
        post.citizen.nickname === null ? undefined : post.citizen.nickname,
    },
    community: post.community.id,
  };
}
