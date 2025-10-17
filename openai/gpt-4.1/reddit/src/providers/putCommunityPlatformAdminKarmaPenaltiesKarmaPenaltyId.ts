import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaPenalty";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminKarmaPenaltiesKarmaPenaltyId(props: {
  admin: AdminPayload;
  karmaPenaltyId: string & tags.Format<"uuid">;
  body: ICommunityPlatformKarmaPenalty.IUpdate;
}): Promise<ICommunityPlatformKarmaPenalty> {
  const { karmaPenaltyId, body } = props;

  const penalty =
    await MyGlobal.prisma.community_platform_karma_penalties.findUnique({
      where: { id: karmaPenaltyId },
    });
  if (!penalty) {
    throw new HttpException("Karma penalty not found", 404);
  }

  if (body.penalty_status !== undefined) {
    if (
      penalty.penalty_status === "revoked" &&
      body.penalty_status === "active"
    ) {
      throw new HttpException("Cannot reinstate revoked penalty", 400);
    }
  }

  const updated =
    await MyGlobal.prisma.community_platform_karma_penalties.update({
      where: { id: karmaPenaltyId },
      data: {
        penalty_type: body.penalty_type ?? undefined,
        penalty_value: body.penalty_value ?? undefined,
        penalty_reason: body.penalty_reason ?? undefined,
        penalty_status: body.penalty_status ?? undefined,
        applied_at: body.applied_at
          ? toISOStringSafe(body.applied_at)
          : undefined,
        expires_at:
          body.expires_at !== undefined
            ? body.expires_at === null
              ? null
              : toISOStringSafe(body.expires_at)
            : undefined,
      },
    });

  return {
    id: updated.id,
    community_platform_member_id: updated.community_platform_member_id,
    community_platform_community_id:
      updated.community_platform_community_id ?? undefined,
    penalty_type: updated.penalty_type,
    penalty_value: updated.penalty_value,
    penalty_reason: updated.penalty_reason,
    penalty_status: updated.penalty_status,
    applied_at: toISOStringSafe(updated.applied_at),
    expires_at: updated.expires_at
      ? toISOStringSafe(updated.expires_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
