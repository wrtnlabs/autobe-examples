import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { DiscussionBoardSectionAtSummaryTransformer } from "../transformers/DiscussionBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardGuestSections(props: {
  guest: GuestPayload;
}): Promise<IDiscussionBoardSection.ISummary> {
  // Query all active sections sorted alphabetically by name
  const sections = await MyGlobal.prisma.discussion_board_sections.findMany({
    where: {
      deleted_at: null,
    },
    orderBy: {
      name: "asc",
    },
    ...DiscussionBoardSectionAtSummaryTransformer.select(),
  });
  // Check if any sections exist
  if (sections.length === 0) {
    throw new HttpException("No sections available", 404);
  }
  // Since function returns single ISummary, return first section
  // This is inconsistent with operation specification but follows function signature
  const firstSection = sections[0];
  return await DiscussionBoardSectionAtSummaryTransformer.transform(
    firstSection,
  );
}
