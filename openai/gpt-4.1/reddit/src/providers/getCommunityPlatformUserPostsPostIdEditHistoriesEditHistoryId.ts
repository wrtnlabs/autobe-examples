import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostEditHistory";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserPostsPostIdEditHistoriesEditHistoryId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  editHistoryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostEditHistory> {
  // Fetch targeted edit history entry
  const editHistory =
    await MyGlobal.prisma.community_platform_post_edit_histories.findUnique({
      where: { id: props.editHistoryId },
    });
  if (!editHistory || editHistory.community_platform_post_id !== props.postId) {
    throw new HttpException("Edit history entry not found for this post", 404);
  }

  // Ensure the post exists and is owned by the calling user
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: { community_platform_user_id: true },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  if (post.community_platform_user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to view this edit history",
      403,
    );
  }

  // Fetch editor user's ISummary
  let editor_user: ICommunityPlatformUser.ISummary | undefined = undefined;
  if (editHistory.community_platform_user_id) {
    const editor = await MyGlobal.prisma.community_platform_users.findUnique({
      where: { id: editHistory.community_platform_user_id },
      select: { id: true, display_name: true },
    });
    if (editor) {
      editor_user = {
        id: editor.id,
        display_name: editor.display_name,
      };
    }
  }

  // Return mapped DTO
  return {
    id: editHistory.id,
    community_platform_post_id: editHistory.community_platform_post_id,
    community_platform_user_id: editHistory.community_platform_user_id,
    editor_user,
    edit_type: editHistory.edit_type,
    snapshot_title: editHistory.snapshot_title,
    snapshot_body: editHistory.snapshot_body ?? null,
    snapshot_url: editHistory.snapshot_url ?? null,
    snapshot_image_uri: editHistory.snapshot_image_uri ?? null,
    edit_reason: editHistory.edit_reason ?? null,
    created_at: toISOStringSafe(editHistory.created_at),
  };
}
