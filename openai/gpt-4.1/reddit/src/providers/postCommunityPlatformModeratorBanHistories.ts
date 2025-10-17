import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanHistory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postCommunityPlatformModeratorBanHistories(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformBanHistory.ICreate;
}): Promise<ICommunityPlatformBanHistory> {
  const { moderator, body } = props;

  // Confirm moderator is active and assigned to the proper community if community_id is specified
  if (body.community_id == null) {
    throw new HttpException(
      "Moderator ban can only be enforced within a specific community (community_id required)",
      403,
    );
  }
  const assigned =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: moderator.id,
        community_id: body.community_id,
        status: "active",
        deleted_at: null,
      },
    });
  if (!assigned) {
    throw new HttpException(
      "Moderator is not authorized for the target community",
      403,
    );
  }

  // Prevent duplicate/conflicting ban
  const conflict =
    await MyGlobal.prisma.community_platform_ban_histories.findFirst({
      where: {
        banned_member_id: body.banned_member_id,
        community_id: body.community_id,
        is_active: true,
      },
    });
  if (conflict) {
    throw new HttpException(
      "An active ban for this member in this community already exists.",
      409,
    );
  }

  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.community_platform_ban_histories.create(
    {
      data: {
        id: v4(),
        banned_member_id: body.banned_member_id,
        issued_by_id: body.issued_by_id,
        community_id: body.community_id ?? null,
        triggering_report_id: body.triggering_report_id ?? null,
        reason: body.reason,
        ban_type: body.ban_type,
        ban_start_at: body.ban_start_at,
        ban_end_at: body.ban_end_at ?? null,
        is_active: body.is_active,
        created_at: now,
        updated_at: now,
      },
    },
  );

  return {
    id: created.id,
    banned_member_id: created.banned_member_id,
    issued_by_id: created.issued_by_id,
    community_id: created.community_id ?? null,
    triggering_report_id: created.triggering_report_id ?? null,
    reason: created.reason,
    ban_type: created.ban_type,
    ban_start_at: toISOStringSafe(created.ban_start_at),
    ban_end_at:
      created.ban_end_at === null ? null : toISOStringSafe(created.ban_end_at),
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
