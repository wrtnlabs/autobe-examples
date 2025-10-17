import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformProfileHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileHistory";
import { IPageICommunityPlatformProfileHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfileHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchCommunityPlatformMemberProfilesProfileIdHistory(props: {
  member: MemberPayload;
  profileId: string & tags.Format<"uuid">;
  body: ICommunityPlatformProfileHistory.IRequest;
}): Promise<IPageICommunityPlatformProfileHistory> {
  const { member, profileId, body } = props;

  // Verify the profile exists and belongs to the authenticated member
  const profile = await MyGlobal.prisma.community_platform_profiles.findFirst({
    where: {
      id: profileId,
      deleted_at: null,
    },
  });
  if (profile === null) {
    throw new HttpException("Profile not found", 404);
  }
  if (profile.community_platform_member_id !== member.id) {
    throw new HttpException("Forbidden: Not your profile", 403);
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortField = body.sort ?? "changed_at";
  const sortOrder = body.order ?? "desc";

  const where: Record<string, unknown> = {
    community_platform_profile_id: profileId,
    ...(body.changed_by_actor !== undefined &&
      body.changed_by_actor !== null && {
        changed_by_actor: body.changed_by_actor,
      }),
    ...((body.date_range_start !== undefined &&
      body.date_range_start !== null) ||
    (body.date_range_end !== undefined && body.date_range_end !== null)
      ? {
          changed_at: {
            ...(body.date_range_start !== undefined &&
              body.date_range_start !== null && {
                gte: body.date_range_start,
              }),
            ...(body.date_range_end !== undefined &&
              body.date_range_end !== null && {
                lte: body.date_range_end,
              }),
          },
        }
      : {}),
  };

  const total =
    await MyGlobal.prisma.community_platform_profile_histories.count({ where });
  const rows =
    await MyGlobal.prisma.community_platform_profile_histories.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    });

  const data = rows.map((h) => ({
    id: h.id,
    community_platform_profile_id: h.community_platform_profile_id,
    username: h.username,
    bio: h.bio,
    avatar_uri: h.avatar_uri,
    display_email: h.display_email,
    status_message: h.status_message,
    is_public: h.is_public,
    changed_by_actor: h.changed_by_actor,
    change_reason: h.change_reason,
    changed_at: toISOStringSafe(h.changed_at),
    created_at: toISOStringSafe(h.created_at),
    deleted_at: h.deleted_at ? toISOStringSafe(h.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
