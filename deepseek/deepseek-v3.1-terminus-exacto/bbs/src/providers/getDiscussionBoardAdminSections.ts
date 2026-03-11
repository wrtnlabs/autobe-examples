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

export async function getDiscussionBoardAdminSections(props: {
  admin: AdminPayload;
}): Promise<IDiscussionBoardSection.ISummary> {
  // Get all active sections (where deleted_at is null)
  const sections = await MyGlobal.prisma.discussion_board_sections.findMany({
    where: {
      deleted_at: null,
    },
    orderBy: { name: "asc" },
    ...DiscussionBoardSectionAtSummaryTransformer.select(),
  });
  // Transform to DTO array
  const transformed = await ArrayUtil.asyncMap(
    sections,
    DiscussionBoardSectionAtSummaryTransformer.transform,
  );
  // The function return type needs to be array: IDiscussionBoardSection.ISummary[]
  // But interface says IDiscussionBoardSection.ISummary (singular)
  // Need to check operation specification
  return transformed as any;
}
