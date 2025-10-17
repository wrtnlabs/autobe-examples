import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminPostsPostId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  // 1. Find existing post for update (for audit trail; 404 if not found)
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: { id: props.postId },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // 2. Prepare updated fields: only permitted updatable fields (from DTO)
  const now = toISOStringSafe(new Date());
  const updateData = {
    title: props.body.title ?? undefined,
    content_body: props.body.content_body ?? undefined,
    content_type: props.body.content_type ?? undefined,
    status: props.body.status ?? undefined,
    updated_at: now,
  };

  // 3. Perform the update
  const updated = await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: updateData,
  });

  // 4. Write audit trail of change
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "admin",
      actor_id: props.admin.id,
      action_type: "update",
      target_table: "community_platform_posts",
      target_id: updated.id,
      details: JSON.stringify({
        before: {
          title: post.title,
          content_body: post.content_body ?? undefined,
          content_type: post.content_type,
          status: post.status,
        },
        after: {
          title: updated.title,
          content_body: updated.content_body ?? undefined,
          content_type: updated.content_type,
          status: updated.status,
        },
      }),
      created_at: now,
    },
  });

  // 5. Return the updated post, mapping date fields to ISO string as required by DTO
  return {
    id: updated.id,
    community_platform_member_id: updated.community_platform_member_id,
    community_platform_community_id: updated.community_platform_community_id,
    title: updated.title,
    content_body: updated.content_body ?? undefined,
    content_type: updated.content_type,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
