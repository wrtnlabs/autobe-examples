import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityStatusChange";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postCommunityPlatformAdminCommunitiesCommunityIdStatusChanges(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityStatusChange.ICreate;
}): Promise<ICommunityPlatformCommunityStatusChange> {
  // Allowed community statuses
  const allowedStatuses = [
    "active",
    "private",
    "banned",
    "archived",
    "suspended",
  ];

  // Validate admin identity matches performed_by_id
  if (props.body.performed_by_id !== props.admin.id) {
    throw new HttpException(
      "Forbidden: Actor mismatch (only the authenticated admin may record the event)",
      403,
    );
  }

  // Validate previous_status and new_status
  if (!allowedStatuses.includes(props.body.previous_status)) {
    throw new HttpException("Invalid previous_status value", 400);
  }
  if (!allowedStatuses.includes(props.body.new_status)) {
    throw new HttpException("Invalid new_status value", 400);
  }

  // Get target community (active only)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
    });
  if (!community) {
    throw new HttpException("Community not found or deleted", 404);
  }

  // Insert row into audit trail (status change)
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_community_status_changes.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_id: props.communityId,
        performed_by_id: props.admin.id, // already checked above
        previous_status: props.body.previous_status,
        new_status: props.body.new_status,
        change_reason:
          typeof props.body.change_reason === "string"
            ? props.body.change_reason
            : null,
        notes: typeof props.body.notes === "string" ? props.body.notes : null,
        created_at: now,
      },
    });

  // Return DTO, all fields, string type for time, strict null/undefined for optional fields
  return {
    id: created.id,
    community_id: created.community_id,
    performed_by_id: created.performed_by_id,
    previous_status: created.previous_status,
    new_status: created.new_status,
    change_reason: created.change_reason ?? null,
    notes: created.notes ?? null,
    created_at: toISOStringSafe(created.created_at),
  };
}
