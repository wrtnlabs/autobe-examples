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

export async function putCommunityPlatformAdminCommunitiesCommunityIdStatusChangesStatusChangeId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  statusChangeId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityStatusChange.IUpdate;
}): Promise<ICommunityPlatformCommunityStatusChange> {
  const { admin, communityId, statusChangeId, body } = props;

  // 1. Fetch the entry.
  const record =
    await MyGlobal.prisma.community_platform_community_status_changes.findFirst(
      {
        where: {
          id: statusChangeId,
          community_id: communityId,
        },
      },
    );
  if (!record) {
    throw new HttpException("Status change entry not found", 404);
  }

  // 2. Perform the update
  const updated =
    await MyGlobal.prisma.community_platform_community_status_changes.update({
      where: { id: statusChangeId },
      data: {
        previous_status: body.previous_status ?? undefined,
        new_status: body.new_status ?? undefined,
        change_reason: body.change_reason ?? undefined,
        notes: body.notes ?? undefined,
      },
    });

  return {
    id: updated.id,
    community_id: updated.community_id,
    performed_by_id: updated.performed_by_id,
    previous_status: updated.previous_status,
    new_status: updated.new_status,
    change_reason:
      typeof updated.change_reason === "undefined"
        ? undefined
        : updated.change_reason,
    notes: typeof updated.notes === "undefined" ? undefined : updated.notes,
    created_at: toISOStringSafe(updated.created_at),
  };
}
