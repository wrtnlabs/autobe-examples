import { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminContentFlagsContentFlagIdModerationQueuesQueueId(props: {
  admin: AdminPayload;
  contentFlagId: string & tags.Format<"uuid">;
  queueId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardContentModerationQueue> {
  // First verify the content flag exists
  const contentFlag =
    await MyGlobal.prisma.discussion_board_content_flags.findUnique({
      where: { id: props.contentFlagId, deleted_at: null },
    });
  if (!contentFlag) {
    throw new HttpException("Content flag not found", 404);
  }
  // Query the moderation queue entry
  const queueEntry =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.findUnique(
      {
        where: { id: props.queueId },
        include: {
          contentFlag: true,
          assignedAdmin: {
            select: { id: true, email: true },
          },
          escalatedByAdmin: {
            select: { id: true, email: true },
          },
        },
      },
    );
  if (!queueEntry) {
    throw new HttpException("Moderation queue entry not found", 404);
  }
  // Validate that the queue entry belongs to the specified content flag
  if (queueEntry.content_flag_id !== props.contentFlagId) {
    throw new HttpException(
      "Moderation queue entry does not belong to the specified content flag",
      400,
    );
  }
  // Since the DTO structure is empty {}, return an empty object
  // This will need to be updated once the actual DTO structure is defined
  return {};
}
