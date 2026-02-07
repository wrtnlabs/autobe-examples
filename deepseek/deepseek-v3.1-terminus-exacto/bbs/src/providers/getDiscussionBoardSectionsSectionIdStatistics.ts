import { IDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSectionStatisticTransformer } from "../transformers/DiscussionBoardSectionStatisticTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSectionsSectionIdStatistics(props: {
  sectionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSectionStatistic> {
  // Verify that the section exists first
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  // Query the statistics for the section using the correct unique constraint field
  const statistics =
    await MyGlobal.prisma.discussion_board_section_statistics.findUnique({
      where: { discussion_board_section_id: props.sectionId },
      ...DiscussionBoardSectionStatisticTransformer.select(),
    });
  if (!statistics) {
    throw new HttpException("Statistics not found for this section", 404);
  }
  return await DiscussionBoardSectionStatisticTransformer.transform(statistics);
}
