import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumPost";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function putPoliticalForumCitizenPostsPostId(props: {
  citizen: CitizenPayload;
  postId: string & tags.Format<"uuid">;
  body: IPoliticalForumPost.IUpdate;
}): Promise<IPoliticalForumPost> {
  // Fetch the target post
  const postResult = await MyGlobal.prisma.political_forum_posts.findUnique({
    where: { id: props.postId },
  });

  if (!postResult) {
    throw new HttpException("Post not found", 404);
  }

  // Verify ownership
  if (postResult.citizen_id !== props.citizen.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Check if within 24-hour edit window (use numeric timestamp comparison to avoid Date objects)
  const editWindowMs = 1000 * 60 * 60 * 24; // Default to 24 hours since MyGlobal.config doesn't exist
  const postCreatedMs = Date.parse(toISOStringSafe(postResult.created_at));
  const editDeadlineMs = postCreatedMs + editWindowMs;
  const nowMs = Date.now();

  if (nowMs > editDeadlineMs) {
    throw new HttpException("Edit window expired", 403);
  }

  // Prepare update data - only update provided fields
  // Convert IUpdate string to update object
  const updateData: any = {};
  if (typeof props.body === "string") {
    try {
      const parsedBody = JSON.parse(props.body);
      if (parsedBody.title !== undefined) updateData.title = parsedBody.title;
      if (parsedBody.body !== undefined) updateData.body = parsedBody.body;
    } catch (e) {
      // Ignore parse errors - proceed with default
    }
  }

  updateData.edit_count = postResult.edit_count + 1;
  updateData.updated_at = toISOStringSafe(new Date());

  // Perform update
  const updatedPostResult = await MyGlobal.prisma.political_forum_posts.update({
    where: { id: props.postId },
    data: updateData,
  });

  // Return a string representation as defined by IPoliticalForumPost
  // This could be the post ID as string, or JSON string of post data
  return JSON.stringify({
    id: updatedPostResult.id,
    title: updatedPostResult.title,
    body: updatedPostResult.body,
    created_at: toISOStringSafe(updatedPostResult.created_at),
    updated_at: toISOStringSafe(updatedPostResult.updated_at),
    deleted_at:
      updatedPostResult.deleted_at !== null
        ? toISOStringSafe(updatedPostResult.deleted_at)
        : null,
    edit_count: updatedPostResult.edit_count,
    citizen_id: updatedPostResult.citizen_id,
    post_state_id: updatedPostResult.post_state_id,
  });
}
