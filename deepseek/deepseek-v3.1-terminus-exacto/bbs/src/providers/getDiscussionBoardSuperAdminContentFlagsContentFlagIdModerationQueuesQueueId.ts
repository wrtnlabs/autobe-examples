import { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardContentModerationQueueAtSummaryTransformer } from "../transformers/DiscussionBoardContentModerationQueueAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminContentFlagsContentFlagIdModerationQueuesQueueId(props: {
  superAdmin: SuperadminPayload;
  contentFlagId: string & tags.Format<"uuid">;
  queueId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardContentModerationQueue> {
  // First verify the content flag exists
  const contentFlag =
    await MyGlobal.prisma.discussion_board_content_flags.findUnique({
      where: { id: props.contentFlagId },
    });
  if (!contentFlag) {
    throw new HttpException("Content flag not found", 404);
  }
  // Then retrieve the moderation queue entry and ensure it belongs to the content flag
  const queue =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.findUnique(
      {
        where: {
          id: props.queueId,
          content_flag_id: props.contentFlagId, // Ensure relationship validation
        },
        ...DiscussionBoardContentModerationQueueAtSummaryTransformer.select(),
      },
    );
  if (!queue) {
    throw new HttpException(
      "Moderation queue entry not found or does not belong to the specified content flag",
      404,
    );
  }
  return await DiscussionBoardContentModerationQueueAtSummaryTransformer.transform(
    queue,
  );
}
