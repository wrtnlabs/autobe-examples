import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postDiscussionBoardModeratorModerationActions(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerationAction.ICreate;
}): Promise<IDiscussionBoardModerationAction> {
  // Verify the moderator session exists
  const moderatorSession =
    await MyGlobal.prisma.discussion_board_moderator_sessions.findFirst({
      where: {
        id: props.moderator.session_id,
        deleted_at: null,
      },
    });

  if (!moderatorSession) {
    throw new HttpException("Moderator session not found", 404);
  }

  // Verify the content report exists and is not deleted
  const contentReport =
    await MyGlobal.prisma.discussion_board_content_reports.findFirst({
      where: {
        id: props.body.discussion_board_content_report_id,
        deleted_at: null,
      },
    });

  if (!contentReport) {
    throw new HttpException("Content report not found", 404);
  }

  // Verify the moderator exists and is not deleted
  const moderator = await MyGlobal.prisma.discussion_board_moderators.findFirst(
    {
      where: {
        id: props.moderator.id,
        deleted_at: null,
      },
    },
  );

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  const now = toISOStringSafe(new Date());

  try {
    // Create the moderation action without incorrect includes
    const created =
      await MyGlobal.prisma.discussion_board_moderation_actions.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          action_type: props.body.action_type,
          action_details: props.body.action_details ?? null,
          duration_days: props.body.duration_days ?? null,
          escalation_level: props.body.escalation_level,
          discussion_board_content_report_id:
            props.body.discussion_board_content_report_id,
          discussion_board_moderator_id: props.moderator.id,
          discussion_board_moderator_session_id: props.moderator.session_id,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });

    // Transform the response according to DTO interfaces
    return {
      id: created.id,
      action_type: created.action_type,
      action_details:
        created.action_details === null ? undefined : created.action_details,
      duration_days:
        created.duration_days === null ? undefined : created.duration_days,
      escalation_level: created.escalation_level,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      discussion_board_content_report_id:
        created.discussion_board_content_report_id,
      discussion_board_moderator_id: created.discussion_board_moderator_id,
      discussion_board_moderator_session_id:
        created.discussion_board_moderator_session_id,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        throw new HttpException("Foreign key constraint violation", 400);
      }
      if (error.code === "P2002") {
        throw new HttpException("Duplicate entry", 409);
      }
    }
    throw new HttpException("Internal server error", 500);
  }
}
