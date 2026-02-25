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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformModerationQueueTransformer } from "../transformers/CommunityPlatformModerationQueueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminModerationQueuesModerationQueueId(props: {
  admin: AdminPayload;
  moderationQueueId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationQueue.IUpdate;
}): Promise<ICommunityPlatformModerationQueue> {
  // Validate priority values
  const validPriorities = ["low", "normal", "high", "critical"];
  if (props.body.priority && !validPriorities.includes(props.body.priority)) {
    throw new HttpException(
      "Priority must be one of: low, normal, high, critical",
      400,
    );
  }
  // Validate status values
  const validStatuses = [
    "pending",
    "assigned",
    "in-review",
    "resolved",
    "dismissed",
  ];
  if (props.body.status && !validStatuses.includes(props.body.status)) {
    throw new HttpException(
      "Status must be one of: pending, assigned, in-review, resolved, dismissed",
      400,
    );
  }
  // Validate resolution values
  const validResolutions = [
    "approved",
    "removed",
    "warned",
    "banned",
    "dismissed",
  ];
  if (
    props.body.resolution &&
    !validResolutions.includes(props.body.resolution)
  ) {
    throw new HttpException(
      "Resolution must be one of: approved, removed, warned, banned, dismissed",
      400,
    );
  }
  // Get current moderation queue item
  const currentQueue =
    await MyGlobal.prisma.community_platform_moderation_queues.findUniqueOrThrow(
      {
        where: { id: props.moderationQueueId },
      },
    );
  // Prepare update data with proper typing
  const updateData: Prisma.community_platform_moderation_queuesUpdateInput = {};
  const now = new Date().toISOString();
  // Handle status transitions and timestamp updates
  if (props.body.status && props.body.status !== currentQueue.status) {
    updateData.status = props.body.status;
    // Set timestamps based on status transitions
    if (
      props.body.status === "assigned" &&
      currentQueue.status !== "assigned"
    ) {
      updateData.assigned_at = now;
    }
    if (
      props.body.status === "in-review" &&
      currentQueue.status !== "in-review"
    ) {
      updateData.review_started_at = now;
    }
    if (
      (props.body.status === "resolved" || props.body.status === "dismissed") &&
      currentQueue.status !== "resolved" &&
      currentQueue.status !== "dismissed"
    ) {
      updateData.resolved_at = now;
      // Require resolution for resolved/dismissed status
      if (!props.body.resolution) {
        throw new HttpException(
          "Resolution is required when resolving or dismissing a moderation queue item",
          400,
        );
      }
      // Require resolution reason when resolution is provided
      if (props.body.resolution && !props.body.resolutionReason) {
        throw new HttpException(
          "Resolution reason is required when providing a resolution",
          400,
        );
      }
    }
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
        throw new HttpException("Moderator not found", 404);
      }
      updateData.moderator = { connect: { id: props.body.moderatorId } };
    }
  }
  // Handle priority update
  if (props.body.priority !== undefined) {
    updateData.priority = props.body.priority;
  }
  // Handle resolution update
  if (props.body.resolution !== undefined) {
    updateData.resolution = props.body.resolution;
    // Require resolution reason when resolution is provided
    if (props.body.resolution && !props.body.resolutionReason) {
      throw new HttpException(
        "Resolution reason is required when providing a resolution",
        400,
      );
    }
  }
  // Handle resolution reason update
  if (props.body.resolutionReason !== undefined) {
    updateData.resolution_reason = props.body.resolutionReason;
  }
  // Always update the updated_at timestamp
  updateData.updated_at = now;
  // Perform the update
  await MyGlobal.prisma.community_platform_moderation_queues.update({
    where: { id: props.moderationQueueId },
    data: updateData,
  });
  // Retrieve the updated moderation queue item with relations
  const updatedQueue =
    await MyGlobal.prisma.community_platform_moderation_queues.findUniqueOrThrow(
      {
        where: { id: props.moderationQueueId },
        ...CommunityPlatformModerationQueueTransformer.select(),
      },
    );
  return await CommunityPlatformModerationQueueTransformer.transform(
    updatedQueue,
  );
}
