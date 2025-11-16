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
import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorPostsPostIdEditHistoryEditHistoryId(props: {
  administrator: AdministratorPayload;
  postId: string & tags.Format<"uuid">;
  editHistoryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostEditHistory> {
  const record =
    await MyGlobal.prisma.community_platform_post_edit_history.findUnique({
      where: { id: props.editHistoryId },
      include: {
        user: true,
        userSession: true,
      },
    });
  if (!record || record.post_id !== props.postId) {
    throw new HttpException(
      "Edit history record not found for this post.",
      404,
    );
  }
  return {
    id: record.id,
    post_id: record.post_id,
    user: {
      id: record.user_id,
    },
    userSession: {
      id: record.user_session_id,
      created_at: toISOStringSafe(record.userSession.created_at),
    },
    old_title: record.old_title ?? undefined,
    old_body: record.old_body ?? undefined,
    new_title: record.new_title ?? undefined,
    new_body: record.new_body ?? undefined,
    edit_reason: record.edit_reason ?? undefined,
    created_at: toISOStringSafe(record.created_at),
  };
}
