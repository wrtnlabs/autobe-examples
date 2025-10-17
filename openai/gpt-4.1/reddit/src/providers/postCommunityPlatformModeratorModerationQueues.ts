import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postCommunityPlatformModeratorModerationQueues(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModerationQueue.ICreate;
}): Promise<ICommunityPlatformModerationQueue> {
  // Validate referenced community
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.body.community_id },
    });
  if (!community) {
    throw new HttpException(
      "Invalid community_id: community does not exist",
      400,
    );
  }

  // Validate referenced report
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.body.report_id },
  });
  if (!report) {
    throw new HttpException("Invalid report_id: report does not exist", 400);
  }

  // Validate assigned_moderator_id, if present (nullable & optional)
  if (
    props.body.assigned_moderator_id !== undefined &&
    props.body.assigned_moderator_id !== null
  ) {
    const assignedModerator =
      await MyGlobal.prisma.community_platform_moderators.findUnique({
        where: { id: props.body.assigned_moderator_id },
      });
    if (!assignedModerator) {
      throw new HttpException(
        "Invalid assigned_moderator_id: moderator does not exist",
        400,
      );
    }
    if (assignedModerator.community_id !== props.body.community_id) {
      throw new HttpException(
        "assigned_moderator_id does not belong to specified community",
        400,
      );
    }
  }

  // Generate UUID and timestamps
  const id = v4();
  const now = toISOStringSafe(new Date());

  // Insert moderation queue entry
  const created =
    await MyGlobal.prisma.community_platform_moderation_queues.create({
      data: {
        id: id,
        community_id: props.body.community_id,
        report_id: props.body.report_id,
        assigned_moderator_id:
          props.body.assigned_moderator_id !== undefined
            ? props.body.assigned_moderator_id
            : null,
        status: props.body.status,
        priority: props.body.priority,
        created_at: now,
        updated_at: now,
      },
    });

  // Build response
  return {
    id: created.id,
    community_id: created.community_id,
    report_id: created.report_id,
    assigned_moderator_id: created.assigned_moderator_id ?? undefined,
    status: created.status,
    priority: created.priority,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
