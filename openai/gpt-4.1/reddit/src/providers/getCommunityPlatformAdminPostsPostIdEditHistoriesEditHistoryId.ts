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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminPostsPostIdEditHistoriesEditHistoryId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  editHistoryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostEditHistory> {
  const { postId, editHistoryId } = props;
  const editHistory =
    await MyGlobal.prisma.community_platform_post_edit_histories.findUnique({
      where: { id: editHistoryId },
      select: {
        id: true,
        community_platform_post_id: true,
        community_platform_user_id: true,
        edit_type: true,
        snapshot_title: true,
        snapshot_body: true,
        snapshot_url: true,
        snapshot_image_uri: true,
        edit_reason: true,
        created_at: true,
      },
    });
  if (!editHistory || editHistory.community_platform_post_id !== postId) {
    throw new HttpException(
      "Edit history entry not found for specified post.",
      404,
    );
  }
  const editorUser = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: editHistory.community_platform_user_id },
    select: {
      id: true,
      display_name: true,
    },
  });
  const editor_user = editorUser
    ? { id: editorUser.id, display_name: editorUser.display_name }
    : undefined;
  return {
    id: editHistory.id,
    community_platform_post_id: editHistory.community_platform_post_id,
    community_platform_user_id: editHistory.community_platform_user_id,
    editor_user,
    edit_type: editHistory.edit_type,
    snapshot_title: editHistory.snapshot_title,
    snapshot_body: editHistory.snapshot_body ?? undefined,
    snapshot_url: editHistory.snapshot_url ?? undefined,
    snapshot_image_uri: editHistory.snapshot_image_uri ?? undefined,
    edit_reason: editHistory.edit_reason ?? undefined,
    created_at: toISOStringSafe(editHistory.created_at),
  };
}
