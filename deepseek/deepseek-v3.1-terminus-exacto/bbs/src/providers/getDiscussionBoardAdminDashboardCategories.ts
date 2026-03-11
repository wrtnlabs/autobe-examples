import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionAtSummaryTransformer } from "../transformers/DiscussionBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminDashboardCategories(props: {
  admin: AdminPayload;
}): Promise<IDiscussionBoardSection.ISummary[]> {
  // Query all sections from database, including both active and soft-deleted sections
  // Ordered by creation date descending (newest first)
  const sections = await MyGlobal.prisma.discussion_board_sections.findMany({
    orderBy: { created_at: "desc" } as const,
    ...DiscussionBoardSectionAtSummaryTransformer.select(),
  });
  // Transform all database records to DTO format
  return await ArrayUtil.asyncMap(
    sections,
    DiscussionBoardSectionAtSummaryTransformer.transform,
  );
}
