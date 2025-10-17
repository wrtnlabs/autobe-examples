import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postCommunityPlatformAdminModerationQueues(props: {
  admin: AdminPayload;
  body: ICommunityPlatformModerationQueue.ICreate;
}): Promise<ICommunityPlatformModerationQueue> {
  // Validate that the community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.body.community_id },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Validate that the report exists
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.body.report_id },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }

  // If an assigned_moderator_id is provided, ensure it is valid
  let assignedModeratorId: (string & tags.Format<"uuid">) | null | undefined =
    null;
  if (
    Object.prototype.hasOwnProperty.call(props.body, "assigned_moderator_id") &&
    props.body.assigned_moderator_id !== undefined &&
    props.body.assigned_moderator_id !== null
  ) {
    const moderator =
      await MyGlobal.prisma.community_platform_moderators.findUnique({
        where: { id: props.body.assigned_moderator_id },
      });
    if (!moderator) {
      throw new HttpException("Assigned moderator not found", 404);
    }
    assignedModeratorId = props.body.assigned_moderator_id;
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_moderation_queues.create({
      data: {
        id: v4(),
        community_id: props.body.community_id,
        report_id: props.body.report_id,
        assigned_moderator_id: assignedModeratorId,
        status: props.body.status,
        priority: props.body.priority,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    community_id: created.community_id,
    report_id: created.report_id,
    assigned_moderator_id: created.assigned_moderator_id,
    status: created.status,
    priority: created.priority,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
