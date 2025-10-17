import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaPenalty";
import { IPageICommunityPlatformKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaPenalty";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorKarmaPenalties(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformKarmaPenalty.IRequest;
}): Promise<IPageICommunityPlatformKarmaPenalty.ISummary> {
  // Find moderator community assignments (active, not soft deleted)
  const moderatorAssignments =
    await MyGlobal.prisma.community_platform_moderators.findMany({
      where: {
        member_id: props.moderator.id,
        deleted_at: null,
        status: "active",
      },
      select: { community_id: true },
    });
  const allowedCommunityIds = moderatorAssignments.map((x) => x.community_id);
  if (allowedCommunityIds.length === 0) {
    throw new HttpException(
      "No moderator scope: not assigned to any community",
      403,
    );
  }

  // Build base filters (enforce soft-delete)
  const filters: Record<string, unknown> = {
    deleted_at: null,
    ...(props.body.member_id !== undefined && {
      community_platform_member_id: props.body.member_id,
    }),
    ...(props.body.community_id !== undefined &&
      props.body.community_id !== null && {
        community_platform_community_id: props.body.community_id,
      }),
    ...(props.body.penalty_type !== undefined && {
      penalty_type: props.body.penalty_type,
    }),
    ...(props.body.penalty_status !== undefined && {
      penalty_status: props.body.penalty_status,
    }),
  };

  // Always apply moderator community scope (unless community_id filter is set)
  if (
    props.body.community_id === undefined ||
    props.body.community_id === null
  ) {
    filters.community_platform_community_id = { in: allowedCommunityIds };
  } else {
    // If community_id is provided and out of scope, return empty result
    if (!allowedCommunityIds.includes(props.body.community_id)) {
      return {
        pagination: {
          current: Number(props.body.page ?? 1),
          limit: Number(props.body.limit ?? 20),
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
  }

  // Applied_at date filtering
  if (props.body.applied_from !== undefined) {
    filters.applied_at = {
      ...((filters.applied_at as object) ?? {}),
      gte: props.body.applied_from,
    };
  }
  if (props.body.applied_to !== undefined) {
    filters.applied_at = {
      ...((filters.applied_at as object) ?? {}),
      lte: props.body.applied_to,
    };
  }

  // Sorting
  const allowedSortFields = [
    "applied_at",
    "penalty_value",
    "created_at",
    "expires_at",
    "penalty_status",
    "penalty_type",
  ];
  const sort_by =
    props.body.sort_by && allowedSortFields.includes(props.body.sort_by)
      ? props.body.sort_by
      : "applied_at";
  const sort_direction =
    props.body.sort_direction === "asc" || props.body.sort_direction === "desc"
      ? props.body.sort_direction
      : "desc";

  // Pagination controls (as plain number)
  const page = Number(props.body.page ?? 1);
  const limit = Number(props.body.limit ?? 20);
  const skip = (page - 1) * limit;

  const [total, rows] = await Promise.all([
    MyGlobal.prisma.community_platform_karma_penalties.count({
      where: filters,
    }),
    MyGlobal.prisma.community_platform_karma_penalties.findMany({
      where: filters,
      orderBy: { [sort_by]: sort_direction },
      skip,
      take: limit,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      community_platform_member_id: row.community_platform_member_id,
      community_platform_community_id:
        row.community_platform_community_id === null
          ? null
          : row.community_platform_community_id,
      penalty_type: row.penalty_type,
      penalty_value: row.penalty_value,
      penalty_reason: row.penalty_reason,
      penalty_status: row.penalty_status,
      applied_at: toISOStringSafe(row.applied_at),
      expires_at:
        row.expires_at === null ? null : toISOStringSafe(row.expires_at),
      created_at: toISOStringSafe(row.created_at),
      deleted_at:
        row.deleted_at === null ? null : toISOStringSafe(row.deleted_at),
    })),
  };
}
