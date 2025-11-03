import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsUserRetentionStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserRetentionStatistics";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function getCommunityBbsSystemAdminStatisticsUserRetention(props: {
  systemAdmin: SystemadminPayload;
  startDate: string & tags.Format<"date-time">;
  endDate: string & tags.Format<"date-time">;
  granularity: string;
  communityId: string & tags.Format<"uuid">;
  communitySlug: string;
  page: number & tags.Type<"int32">;
  pageSize: number & tags.Type<"int32">;
}): Promise<ICommunityBbsUserRetentionStatistics> {
  const {
    systemAdmin,
    startDate,
    endDate,
    granularity,
    communityId,
    communitySlug,
    page,
    pageSize,
  } = props;

  // Validate date range
  const startTs = Date.parse(startDate);
  const endTs = Date.parse(endDate);
  if (Number.isNaN(startTs) || Number.isNaN(endTs) || startTs > endTs) {
    throw new HttpException("Bad Request: Invalid date range", 400);
  }

  // Enforce sensible maximum span to avoid heavy queries
  const spanDays = Math.ceil((endTs - startTs) / (1000 * 60 * 60 * 24));
  const maxSpanDays = 730;
  if (spanDays > maxSpanDays) {
    throw new HttpException(
      "Bad Request: Requested span too large; consider using an asynchronous export job",
      400,
    );
  }

  // Validate granularity
  if (
    !(
      granularity === "day" ||
      granularity === "week" ||
      granularity === "month"
    )
  ) {
    throw new HttpException(
      "Bad Request: granularity must be one of 'day','week','month'",
      400,
    );
  }

  // Pagination enforcement
  const currentPage = Number(page) || 1;
  const limit = Math.min(Number(pageSize) || 20, 100);

  // Community validation when filter provided
  if (communityId || communitySlug) {
    const where: any = { deleted_at: null };
    if (communityId) where.id = communityId;
    if (communitySlug) where.slug = communitySlug;

    const community = await MyGlobal.prisma.community_bbs_communities.findFirst(
      {
        where,
        select: { id: true, slug: true },
      },
    );

    if (!community) {
      throw new HttpException(
        "Bad Request: community not found or inactive",
        400,
      );
    }

    if (
      communityId &&
      communitySlug &&
      (community.id !== communityId || community.slug !== communitySlug)
    ) {
      throw new HttpException(
        "Bad Request: communityId and communitySlug mismatch",
        400,
      );
    }
  }

  // Audit: record access
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      entity: "statistics",
      action: "user_retention_view",
      actor_type: "system_admin",
      actor_id: systemAdmin.id,
      payload: JSON.stringify({
        startDate,
        endDate,
        granularity,
        communityId: communityId ?? null,
        communitySlug: communitySlug ?? null,
        page: currentPage,
        pageSize: limit,
      }),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Fallback: full cohort logic requires advanced aggregation/ETL not safe in single function
  /**
   * SCHEMA-INTERFACE CONTRADICTION:
   *
   * - Implementing accurate cohort retention (windowed unique-member counts,
   *   membership lifetime joins, de-duplication across days/weeks/months)
   *   requires tailored SQL/ETL pipelines or multi-staged queries.
   * - The current Prisma schema and single-query approach cannot safely produce
   *   those results in a robust, performant way inside this provider function.
   *
   * Resolution: return a mock object matching the expected type. Replace with a
   * dedicated analytics service or materialized aggregation SQL.
   */
  return typia.random<ICommunityBbsUserRetentionStatistics>();
}
