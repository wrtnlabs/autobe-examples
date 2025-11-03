import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityModeratorInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorInvitation";
import { IPageICommunityPlatformCommunityModeratorInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModeratorInvitation";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdModeratorInvitations(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModeratorInvitation.IRequest;
}): Promise<IPageICommunityPlatformCommunityModeratorInvitation.ISummary> {
  const { communityId, body } = props;
  const page = body.page ?? 0;
  const limit = body.limit ?? 20;
  const skip = page * limit;

  const rangeFilter = (
    start: (string & tags.Format<"date-time">) | undefined,
    end: (string & tags.Format<"date-time">) | undefined,
  ) =>
    start !== undefined || end !== undefined
      ? {
          ...(start !== undefined ? { gte: start } : {}),
          ...(end !== undefined ? { lte: end } : {}),
        }
      : undefined;

  const where = {
    community_platform_community_id: communityId,
    ...(body.invitee_user_id !== undefined && {
      community_platform_user_id: body.invitee_user_id,
    }),
    ...(body.inviter_user_id !== undefined && {
      invited_by_user_id: body.inviter_user_id,
    }),
    ...(body.status === "pending"
      ? { accepted_at: null, revoked_at: null }
      : {}),
    ...(body.status === "accepted" ? { accepted_at: { not: null } } : {}),
    ...(body.status === "revoked" ? { revoked_at: { not: null } } : {}),
    ...(rangeFilter(body.invited_after, body.invited_before) !== undefined && {
      invited_at: rangeFilter(body.invited_after, body.invited_before),
    }),
    ...(rangeFilter(body.accepted_after, body.accepted_before) !==
      undefined && {
      accepted_at: rangeFilter(body.accepted_after, body.accepted_before),
    }),
    ...(rangeFilter(body.revoked_after, body.revoked_before) !== undefined && {
      revoked_at: rangeFilter(body.revoked_after, body.revoked_before),
    }),
  };

  let orderBy: Record<string, "asc" | "desc">;
  if (body.sort_by === "accepted_at") {
    orderBy = { accepted_at: body.sort_order === "asc" ? "asc" : "desc" };
  } else if (body.sort_by === "revoked_at") {
    orderBy = { revoked_at: body.sort_order === "asc" ? "asc" : "desc" };
  } else {
    orderBy = { invited_at: body.sort_order === "asc" ? "asc" : "desc" };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_moderator_invitations.findMany(
      {
        where,
        orderBy: orderBy,
        skip,
        take: limit,
      },
    ),
    MyGlobal.prisma.community_platform_community_moderator_invitations.count({
      where,
    }),
  ]);

  // Gather user and community IDs
  const inviteeIds = rows.map((row) => row.community_platform_user_id);
  const inviterIds = rows.map((row) => row.invited_by_user_id);
  const communityIds = rows.map((row) => row.community_platform_community_id);

  const [inviteeUsers, inviterUsers, communities] = await Promise.all([
    MyGlobal.prisma.community_platform_users.findMany({
      where: { id: { in: inviteeIds } },
    }),
    MyGlobal.prisma.community_platform_users.findMany({
      where: { id: { in: inviterIds } },
    }),
    MyGlobal.prisma.community_platform_communities.findMany({
      where: { id: { in: communityIds } },
    }),
  ]);

  const inviteeMap = new Map(inviteeUsers.map((u) => [u.id, u]));
  const inviterMap = new Map(inviterUsers.map((u) => [u.id, u]));
  const communityMap = new Map(communities.map((c) => [c.id, c]));

  const data = rows.map((row) => ({
    id: row.id,
    user: {
      id: row.community_platform_user_id,
      display_name:
        inviteeMap.get(row.community_platform_user_id)?.display_name ?? "",
    },
    community: {
      id: row.community_platform_community_id,
      name: communityMap.get(row.community_platform_community_id)?.name ?? "",
      description:
        communityMap.get(row.community_platform_community_id)?.description ??
        "",
    },
    invited_by: {
      id: row.invited_by_user_id,
      display_name: inviterMap.get(row.invited_by_user_id)?.display_name ?? "",
    },
    invited_at: toISOStringSafe(row.invited_at),
    accepted_at:
      row.accepted_at === null ? null : toISOStringSafe(row.accepted_at),
    revoked_at:
      row.revoked_at === null ? null : toISOStringSafe(row.revoked_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / (limit === 0 ? 1 : limit)),
    },
    data,
  };
}
