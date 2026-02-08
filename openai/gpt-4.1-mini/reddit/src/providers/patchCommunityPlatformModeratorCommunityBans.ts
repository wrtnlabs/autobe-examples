import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorCommunityBans(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformCommunityBan.IRequest;
}): Promise<IPageICommunityPlatformCommunityBan.ISummary> {
  // Cast primitive properties that do not exist on IRequest but are used
  const body = props.body as unknown as {
    page?: number | null;
    limit?: number | null;
    community_id?: string | null;
    user_id?: string | null;
    ban_status?: "active" | "unbanned" | null;
    banned_before?: Date | string | null;
    banned_after?: Date | string | null;
  };
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: {
    community_id?: string & import("typia").tags.Format<"uuid">;

    user_id?: string & import("typia").tags.Format<"uuid">;

    unbanned_at?: null | {
      not: null;
    };
    banned_at?: {
      lte?: string & import("typia").tags.Format<"date-time">;

      gte?: string & import("typia").tags.Format<"date-time">;
    };
  } = {};
  if (body.community_id !== undefined && body.community_id !== null) {
    where.community_id = body.community_id satisfies string &
      import("typia").tags.Format<"uuid"> as string &
      import("typia").tags.Format<"uuid">;
  }
  if (body.user_id !== undefined && body.user_id !== null) {
    where.user_id = body.user_id satisfies string &
      import("typia").tags.Format<"uuid"> as string &
      import("typia").tags.Format<"uuid">;
  }
  if (body.ban_status !== undefined && body.ban_status !== null) {
    if (body.ban_status === "active") {
      where.unbanned_at = null;
    } else if (body.ban_status === "unbanned") {
      where.unbanned_at = { not: null };
    }
  }
  if (body.banned_before !== undefined && body.banned_before !== null) {
    where.banned_at = where.banned_at ?? {};
    const bannedBeforeValue =
      body.banned_before instanceof Date
        ? toISOStringSafe(body.banned_before)
        : body.banned_before;
    where.banned_at.lte = bannedBeforeValue satisfies string &
      import("typia").tags.Format<"date-time"> as string &
      import("typia").tags.Format<"date-time">;
  }
  if (body.banned_after !== undefined && body.banned_after !== null) {
    where.banned_at = where.banned_at ?? {};
    const bannedAfterValue =
      body.banned_after instanceof Date
        ? toISOStringSafe(body.banned_after)
        : body.banned_after;
    where.banned_at.gte = bannedAfterValue satisfies string &
      import("typia").tags.Format<"date-time"> as string &
      import("typia").tags.Format<"date-time">;
  }
  const bans = await MyGlobal.prisma.community_platform_community_bans.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy: { banned_at: "desc" },
      select: {
        id: true,
        community_id: true,
        user_id: true,
        banned_at: true,
        unbanned_at: true,
        reason: true,
        community: {
          select: { name: true },
        },
        user: {
          select: { username: true, display_name: true },
        },
      },
    },
  );
  const total = await MyGlobal.prisma.community_platform_community_bans.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: bans.map((b) => ({
      id: b.id,
      community_id: b.community_id,
      user_id: b.user_id,
      banned_at: b.banned_at,
      unbanned_at: b.unbanned_at,
      reason: b.reason ?? null,
      community_name: b.community.name,
      username: b.user.username,
      display_name: b.user.display_name,
      is_active: b.unbanned_at === null,
    })),
  };
}
