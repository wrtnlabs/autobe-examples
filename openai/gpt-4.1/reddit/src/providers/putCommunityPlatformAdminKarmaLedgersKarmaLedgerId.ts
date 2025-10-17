import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaLedger } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaLedger";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminKarmaLedgersKarmaLedgerId(props: {
  admin: AdminPayload;
  karmaLedgerId: string & tags.Format<"uuid">;
  body: ICommunityPlatformKarmaLedger.IUpdate;
}): Promise<ICommunityPlatformKarmaLedger> {
  const now = toISOStringSafe(new Date());

  // Find the ledger and error if not found or soft-deleted
  const existing =
    await MyGlobal.prisma.community_platform_karma_ledgers.findUnique({
      where: { id: props.karmaLedgerId },
    });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Karma ledger not found", 404);
  }

  // Prepare update fields (only allowed fields)
  const updateData = {
    ...(props.body.current_karma !== undefined && {
      current_karma: props.body.current_karma,
    }),
    ...(props.body.feature_lock_reason !== undefined && {
      feature_lock_reason: props.body.feature_lock_reason,
    }),
    updated_at: now,
  };
  const updated = await MyGlobal.prisma.community_platform_karma_ledgers.update(
    {
      where: { id: props.karmaLedgerId },
      data: updateData,
    },
  );

  // Audit log
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "admin",
      actor_id: props.admin.id,
      action_type: "update",
      target_table: "community_platform_karma_ledgers",
      target_id: props.karmaLedgerId,
      details: JSON.stringify({
        before: {
          current_karma: existing.current_karma,
          feature_lock_reason: existing.feature_lock_reason,
        },
        after: updateData,
      }),
      created_at: now,
    },
  });

  return {
    id: updated.id,
    community_platform_member_id: updated.community_platform_member_id,
    community_platform_community_id:
      updated.community_platform_community_id ?? undefined,
    current_karma: updated.current_karma,
    feature_lock_reason: updated.feature_lock_reason ?? undefined,
    updated_at: toISOStringSafe(updated.updated_at),
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
