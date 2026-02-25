import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardCommentModerationTransformer } from "../transformers/DiscussionBoardCommentModerationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminCommentsModerationDashboard(props: {
  admin: AdminPayload;
}): Promise<IDiscussionBoardCommentModeration> {
  // Verify administrator exists and is active
  const adminRecord =
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: { id: props.admin.id, deleted_at: null },
    });
  // Get the most recent moderation action to represent the dashboard state
  const latestModeration =
    await MyGlobal.prisma.discussion_board_comment_moderations.findFirst({
      orderBy: { created_at: "desc" },
      ...DiscussionBoardCommentModerationTransformer.select(),
    });
  if (!latestModeration) {
    // If no moderation actions exist, create a placeholder dashboard record
    const now = new Date();
    return {
      id: v4(),
      action_type: "dashboard_view",
      reason: "Moderation dashboard accessed - no actions recorded",
      status: "completed",
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
      comment: {
        id: v4(),
        content: "No comments moderated yet",
        author: {
          id: props.admin.id satisfies string as string,
          display_name: adminRecord.display_name,
          bio: undefined,
          created_at: toISOStringSafe(adminRecord.created_at),
        },
        created_at: toISOStringSafe(now),
        updated_at: toISOStringSafe(now),
      },
      admin: {
        id: props.admin.id satisfies string as string,
        email: adminRecord.email,
        display_name: adminRecord.display_name,
        created_at: toISOStringSafe(adminRecord.created_at),
      },
    };
  }
  return await DiscussionBoardCommentModerationTransformer.transform(
    latestModeration,
  );
}
