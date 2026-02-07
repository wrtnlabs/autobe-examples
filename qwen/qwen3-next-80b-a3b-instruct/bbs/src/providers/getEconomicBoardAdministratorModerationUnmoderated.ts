import { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getEconomicBoardAdministratorModerationUnmoderated(props: {
  administrator: AdministratorPayload;
}): Promise<IPageIEconomicBoardArticle.ISummary> {
  // Extract page and limit from request or use defaults: 20 items per page
  const page = 1; // Default page (1-indexed)
  const limit = 20; // Default limit (20 items per page)
  const skip = (page - 1) * limit;
  // Define extremism keywords from 07-admin-system.md (assumed set)
  const extremismKeywords = [
    "extremist",
    "radical",
    "hate",
    "supremacy",
    "terrorist",
    "genocide",
    "ethnic cleansing",
    "violence",
    "incite",
    "attack",
    "destroy",
    "eliminate",
    "purge",
    "exterminate",
    "slaughter",
  ];
  // Build full-text search condition using GIN index: search in title and content
  const searchCondition = {
    OR: extremismKeywords.map((keyword) => ({
      OR: [
        { title: { contains: keyword, mode: "insensitive" } as const },
        { content: { contains: keyword, mode: "insensitive" } as const },
      ],
    })),
  };
  // Get paginated data
  const data = await MyGlobal.prisma.economic_board_articles.findMany({
    where: {
      deleted_at: null,
      ...searchCondition,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      created_at: true,
      economic_board_citizen_id: true,
    },
  });
  // Count total matching records
  const total = await MyGlobal.prisma.economic_board_articles.count({
    where: {
      deleted_at: null,
      ...searchCondition,
    },
  });
  // Transform each article with citizen display_name
  const transformedData = data.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    title: item.title,
    created_at: toISOStringSafe(item.created_at) as string &
      tags.Format<"date-time">,
    author_name: "", // Will be filled by joining with citizen
    moderated_reason: "Suspicious language detected", // Default reason per spec
    economic_board_citizen_id: item.economic_board_citizen_id,
  }));
  // Fetch citizen display_names in one query to avoid N+1
  // Extract all citizen IDs from data
  const citizenIds = [
    ...new Set(data.map((item) => item.economic_board_citizen_id)),
  ];
  const citizens = await MyGlobal.prisma.economic_board_citizens.findMany({
    where: {
      id: { in: citizenIds },
      deleted_at: null,
    },
    select: {
      id: true,
      display_name: true,
    },
  });
  // Create map for lookup
  const citizenMap = new Map(citizens.map((c) => [c.id, c.display_name]));
  // Apply display_name to each transformed article
  const finalData = transformedData.map((item) => ({
    ...item,
    author_name: citizenMap.get(item.economic_board_citizen_id) || "Unknown",
  }));
  return {
    data: finalData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
