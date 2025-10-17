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

export async function getCommunityPlatformAdminCommunitiesCommunityIdStatusChangesStatusChangeId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  statusChangeId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityStatusChange> {
  const statusChange =
    await MyGlobal.prisma.community_platform_community_status_changes.findFirst(
      {
        where: {
          id: props.statusChangeId,
          community_id: props.communityId,
        },
        select: {
          id: true,
          community_id: true,
          performed_by_id: true,
          previous_status: true,
          new_status: true,
          change_reason: true,
          notes: true,
          created_at: true,
          community: {
            select: {
              deleted_at: true,
            },
          },
        },
      },
    );
  if (!statusChange || statusChange.community.deleted_at !== null) {
    throw new HttpException(
      "Status change not found or community is deleted",
      404,
    );
  }
  return {
    id: statusChange.id,
    community_id: statusChange.community_id,
    performed_by_id: statusChange.performed_by_id,
    previous_status: statusChange.previous_status,
    new_status: statusChange.new_status,
    change_reason: statusChange.change_reason ?? undefined,
    notes: statusChange.notes ?? undefined,
    created_at: toISOStringSafe(statusChange.created_at),
  };
}
