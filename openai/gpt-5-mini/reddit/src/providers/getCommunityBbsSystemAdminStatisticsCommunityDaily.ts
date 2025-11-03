import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageICommunityBbsMvCommunityBbsDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsMvCommunityBbsDailyStat";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBbsMvCommunityBbsDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMvCommunityBbsDailyStat";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function getCommunityBbsSystemAdminStatisticsCommunityDaily(props: {
  systemAdmin: SystemadminPayload;
  communityId: string & tags.Format<"uuid">;
  dayFrom: string & tags.Format<"date">;
  dayTo: string & tags.Format<"date">;
  limit: number & tags.Type<"int32">;
  cursor: string;
}): Promise<IPageICommunityBbsMvCommunityBbsDailyStat.ISummary> {
  const { systemAdmin, communityId, dayFrom, dayTo, cursor } = props;

  // Authorization: verify the system admin exists and is active
  const admin = await MyGlobal.prisma.community_bbs_systemadmin.findUnique({
    where: { id: systemAdmin.id },
  });
  if (!admin || admin.deleted_at) throw new HttpException("Unauthorized", 403);

  // Validate day range
  if (dayFrom && dayTo && dayFrom > dayTo)
    throw new HttpException("Bad Request: dayFrom must be <= dayTo", 400);

  // Enforce and normalize limit
  let take = Number(props.limit) || 20;
  if (take < 1) take = 1;
  if (take > 100) take = 100;

  // Decode cursor if provided (expected format: base64("<dayIso>::<id>"))
  let cursorDay: string | undefined;
  let cursorId: string | undefined;
  if (cursor) {
    try {
      const decoded = Buffer.from(cursor, "base64").toString("utf-8");
      const [d, id] = decoded.split("::");
      if (!d || !id) throw new Error("Invalid cursor");
      cursorDay = d;
      cursorId = id;
    } catch (err) {
      throw new HttpException("Bad Request: invalid cursor", 400);
    }
  }

  // Build where condition (schema-first, only existing fields)
  const where: Record<string, unknown> = {};
  if (communityId !== undefined && communityId !== null && communityId !== "")
    where.community_id = communityId;
  if (dayFrom || dayTo) {
    const dayRange: Record<string, string> = {};
    if (dayFrom) dayRange.gte = `${dayFrom}T00:00:00.000Z`;
    if (dayTo) dayRange.lte = `${dayTo}T23:59:59.999Z`;
    where.day = dayRange;
  }
  if (cursorDay && cursorId) {
    // For descending order (day desc, id desc) include values before the cursor
    where.OR = [
      { day: { lt: cursorDay } },
      { day: cursorDay, id: { lt: cursorId } },
    ];
  }

  // Total count for pagination metadata
  const total = await MyGlobal.prisma.mv_community_bbs_daily_stats.count({
    where,
  });

  // Fetch rows with related community and small nested selection
  const rows = await MyGlobal.prisma.mv_community_bbs_daily_stats.findMany({
    where,
    include: {
      community: {
        include: {
          creator: true,
          community_bbs_community_settings: true,
        },
      },
    },
    orderBy: [{ day: "desc" }, { id: "desc" }],
    take: take + 1,
  });

  const hasNext = rows.length > take;
  const pageRows = hasNext ? rows.slice(0, take) : rows;

  const data = pageRows.map((r) => {
    const community = r.community!;
    const settings = community.community_bbs_community_settings ?? null;

    const dayIso = r.day ? toISOStringSafe(r.day) : "";
    const dayOnly =
      dayIso && dayIso.length >= 10
        ? (dayIso.slice(0, 10) as string & tags.Format<"date">)
        : ("" as string & tags.Format<"date">);

    // Narrow settings.visibility (primitive string -> literal union) using typia.assert at property level
    const settingsVisibility: "public" | "restricted" | "private" | undefined =
      settings && settings.visibility != null
        ? typia.assert<"public" | "restricted" | "private">(
            settings.visibility as unknown as string,
          )
        : undefined;

    return {
      id: r.id as string & tags.Format<"uuid">,
      community: {
        id: community.id as string & tags.Format<"uuid">,
        name: community.name,
        slug: community.slug,
        description: community.description ?? undefined,
        creator: {
          id: community.creator.id as string & tags.Format<"uuid">,
          username: community.creator.username,
          display_name: community.creator.display_name ?? undefined,
          karma: community.creator.karma,
          created_at: toISOStringSafe(community.creator.created_at),
          updated_at: toISOStringSafe(community.creator.updated_at),
        },
        visibility: community.visibility as "public" | "restricted" | "private",
        post_approval_required: community.post_approval_required,
        members_count: community.members_count,
        posts_count: community.posts_count,
        community_settings: settings
          ? {
              id: settings.id as string & tags.Format<"uuid">,
              community_id: settings.community_id as string &
                tags.Format<"uuid">,
              visibility: settingsVisibility,
              require_post_approval: settings.require_post_approval ?? null,
              max_images_per_post: settings.max_images_per_post ?? null,
              allowed_image_mime_types: settings.allowed_image_mime_types
                ? settings.allowed_image_mime_types.split(",").filter(Boolean)
                : undefined,
              created_at: toISOStringSafe(settings.created_at),
              updated_at: toISOStringSafe(settings.updated_at),
              deleted_at: settings.deleted_at
                ? toISOStringSafe(settings.deleted_at)
                : null,
            }
          : undefined,
        created_at: toISOStringSafe(community.created_at),
        updated_at: toISOStringSafe(community.updated_at),
        deleted_at: community.deleted_at
          ? toISOStringSafe(community.deleted_at)
          : null,
      },
      day: dayOnly,
      posts_count: r.posts_count,
      comments_count: r.comments_count,
      new_members: r.new_members,
      active_users: r.active_users,
      avg_post_score: r.avg_post_score ?? null,
      created_at: toISOStringSafe(r.created_at),
    } satisfies ICommunityBbsMvCommunityBbsDailyStat.ISummary;
  });

  const pagination = {
    current: 0,
    limit: Number(take),
    records: Number(total),
    pages: Math.ceil(Number(total) / Number(take)),
  } satisfies IPage.IPagination;

  return {
    pagination,
    data,
  };
}
