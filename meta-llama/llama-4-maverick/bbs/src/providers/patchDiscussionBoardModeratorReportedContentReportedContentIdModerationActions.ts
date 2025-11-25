import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorReportedContentReportedContentIdModerationActions(props: {
  moderator: ModeratorPayload;
  reportedContentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModerationAction.IUpdate;
}): Promise<IDiscussionBoardModerationAction> {
  const moderationAction =
    await MyGlobal.prisma.discussion_board_moderation_actions.upsert({
      where: {
        id: props.reportedContentId,
      },
      create: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_reported_content_id: props.reportedContentId,
        discussion_board_moderator_id: props.moderator.id,
        action_taken: props.body as string,
        created_at: toISOStringSafe(new Date()),
      },
      update: {
        action_taken: props.body as string,
      },
    });

  return moderationAction.action_taken satisfies IDiscussionBoardModerationAction as IDiscussionBoardModerationAction;
}
