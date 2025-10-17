import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postCommunityPlatformAdminBanHistories(props: {
  admin: AdminPayload;
  body: ICommunityPlatformBanHistory.ICreate;
}): Promise<ICommunityPlatformBanHistory> {
  const { admin, body } = props;

  // 1. Validate admin exists and is not deleted (already ensured by AdminAuth)

  // 2. Validate banned member exists and is not deleted
  const bannedMember =
    await MyGlobal.prisma.community_platform_members.findFirst({
      where: {
        id: body.banned_member_id,
        deleted_at: null,
      },
    });
  if (!bannedMember) {
    throw new HttpException("Banned member does not exist", 404);
  }

  // 3. Validate issued_by_id (admin or moderator) exists and is not deleted
  // First, check admin
  let issuerValid = false;
  const issuerAdmin = await MyGlobal.prisma.community_platform_admins.findFirst(
    {
      where: {
        id: body.issued_by_id,
        deleted_at: null,
        status: "active",
      },
    },
  );
  if (issuerAdmin) {
    issuerValid = true;
  } else {
    // If not admin, try moderator
    const issuerModerator =
      await MyGlobal.prisma.community_platform_moderators.findFirst({
        where: {
          id: body.issued_by_id,
          deleted_at: null,
          status: "active",
        },
      });
    if (issuerModerator) {
      issuerValid = true;
    }
  }
  if (!issuerValid) {
    throw new HttpException("Ban issuer does not exist or is not active", 404);
  }

  // 4. If community_id provided (null/undefined check), validate exists
  if (body.community_id !== undefined && body.community_id !== null) {
    const community =
      await MyGlobal.prisma.community_platform_communities.findFirst({
        where: {
          id: body.community_id,
          deleted_at: null,
        },
      });
    if (!community) {
      throw new HttpException("Community does not exist", 404);
    }
  }

  // 5. If triggering_report_id provided, validate exists
  if (
    body.triggering_report_id !== undefined &&
    body.triggering_report_id !== null
  ) {
    const report = await MyGlobal.prisma.community_platform_reports.findFirst({
      where: {
        id: body.triggering_report_id,
      },
    });
    if (!report) {
      throw new HttpException("Triggering report does not exist", 404);
    }
  }

  // 6. Check for duplicate active ban (banned_member_id + community_id (nullable))
  const duplicateBan =
    await MyGlobal.prisma.community_platform_ban_histories.findFirst({
      where: {
        banned_member_id: body.banned_member_id,
        is_active: true,
        ...(body.community_id !== undefined && body.community_id !== null
          ? { community_id: body.community_id }
          : { community_id: null }),
      },
    });
  if (duplicateBan) {
    throw new HttpException(
      "Duplicate active ban for this member and context",
      409,
    );
  }

  // 7. Create the ban history
  const now = toISOStringSafe(new Date());
  const id = v4();
  const created = await MyGlobal.prisma.community_platform_ban_histories.create(
    {
      data: {
        id: id,
        banned_member_id: body.banned_member_id,
        issued_by_id: body.issued_by_id,
        community_id:
          body.community_id === undefined ? null : body.community_id,
        triggering_report_id:
          body.triggering_report_id === undefined
            ? null
            : body.triggering_report_id,
        reason: body.reason,
        ban_type: body.ban_type,
        ban_start_at: body.ban_start_at,
        ban_end_at: body.ban_end_at === undefined ? null : body.ban_end_at,
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
    community_id:
      created.community_id === undefined ? null : created.community_id,
    triggering_report_id:
      created.triggering_report_id === undefined
        ? null
        : created.triggering_report_id,
    reason: created.reason,
    ban_type: created.ban_type,
    ban_start_at: toISOStringSafe(created.ban_start_at),
    ban_end_at:
      created.ban_end_at === undefined || created.ban_end_at === null
        ? null
        : toISOStringSafe(created.ban_end_at),
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
