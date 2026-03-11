import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSectionAtSummaryTransformer } from "../transformers/DiscussionBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminDashboardCategories(props: {
  superAdmin: SuperadminPayload;
}): Promise<IDiscussionBoardSection.ISummary[]> {
  // Authorization already handled by superAdmin decorator
  // Query all sections regardless of deletion status, ordered by creation date descending
  const sections = await MyGlobal.prisma.discussion_board_sections.findMany({
    ...DiscussionBoardSectionAtSummaryTransformer.select(),
    orderBy: {
      created_at: "desc" as const,
    } satisfies Prisma.discussion_board_sectionsOrderByWithRelationInput,
  });
  // Transform each section to ISummary DTO
  return await ArrayUtil.asyncMap(
    sections,
    DiscussionBoardSectionAtSummaryTransformer.transform,
  );
}
