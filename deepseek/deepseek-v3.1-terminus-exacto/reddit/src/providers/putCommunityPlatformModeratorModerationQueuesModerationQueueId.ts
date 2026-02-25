import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformModerationQueueTransformer } from "../transformers/CommunityPlatformModerationQueueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformModeratorModerationQueuesModerationQueueId(props: {
  moderator: ModeratorPayload;
  moderationQueueId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationQueue.IUpdate;
}): Promise<ICommunityPlatformModerationQueue> {
  // First verify the moderation queue item exists
  const existingQueue =
    await MyGlobal.prisma.community_platform_moderation_queues.findUniqueOrThrow(
      {
        where: { id: props.moderationQueueId },
      },
    );
  // Prepare update data with workflow state transitions
  const updateData: Prisma.community_platform_moderation_queuesUpdateInput = {
    updated_at: new Date(),
  };
  // Handle status changes and timestamp updates
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
    // Handle workflow state transitions
    if (
      props.body.status === "assigned" &&
      existingQueue.status !== "assigned"
    ) {
      updateData.assigned_at = new Date();
    } else if (
      props.body.status === "in-review" &&
      existingQueue.status !== "in-review"
    ) {
      updateData.review_started_at = new Date();
    } else if (
      (props.body.status === "resolved" || props.body.status === "dismissed") &&
      existingQueue.status !== "resolved" &&
      existingQueue.status !== "dismissed"
    ) {
      updateData.resolved_at = new Date();
    }
  }
  // Handle priority validation
  if (props.body.priority !== undefined) {
    const validPriorities = ["low", "normal", "high", "critical"];
    if (!validPriorities.includes(props.body.priority)) {
      throw new HttpException(
        "Invalid priority value. Must be one of: low, normal, high, critical",
        400,
      );
    }
    updateData.priority = props.body.priority;
  }
  // Handle moderator assignment
  if (props.body.moderatorId !== undefined) {
    if (props.body.moderatorId === null) {
      updateData.moderator = { disconnect: true };
    } else {
      // Verify moderator exists
      const moderator =
        await MyGlobal.prisma.community_platform_moderators.findUnique({
          where: { id: props.body.moderatorId },
        });
      if (!moderator) {
        throw new HttpException("Moderator not found", 400);
      }
      updateData.moderator = { connect: { id: props.body.moderatorId } };
    }
  }
  // Handle resolution fields
  if (props.body.resolution !== undefined) {
    updateData.resolution = props.body.resolution;
  }
  if (props.body.resolutionReason !== undefined) {
    updateData.resolution_reason = props.body.resolutionReason;
  }
  // Validate that resolution reason is provided when resolution is set
  if (props.body.resolution && !props.body.resolutionReason) {
    throw new HttpException(
      "Resolution reason is required when resolution is set",
      400,
    );
  }
  // Update the moderation queue item
  const updatedQueue =
    await MyGlobal.prisma.community_platform_moderation_queues.update({
      where: { id: props.moderationQueueId },
      data: updateData,
      ...CommunityPlatformModerationQueueTransformer.select(),
    });
  return await CommunityPlatformModerationQueueTransformer.transform(
    updatedQueue,
  );
}
