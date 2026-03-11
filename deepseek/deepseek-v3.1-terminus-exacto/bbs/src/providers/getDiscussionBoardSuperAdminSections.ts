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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getDiscussionBoardSuperAdminSections(props: {
  superAdmin: SuperadminPayload;
}): Promise<IDiscussionBoardSection.ISummary[]> {
  const sections = await MyGlobal.prisma.discussion_board_sections.findMany({
    where: { deleted_at: null },
    orderBy: { name: "asc" },
    ...DiscussionBoardSectionAtSummaryTransformer.select(),
  });
  return await ArrayUtil.asyncMap(
    sections,
    DiscussionBoardSectionAtSummaryTransformer.transform,
  );
}
