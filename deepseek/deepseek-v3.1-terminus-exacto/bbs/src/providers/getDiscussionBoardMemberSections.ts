import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardSectionAtSummaryTransformer } from "../transformers/DiscussionBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardMemberSections(props: {
  member: MemberPayload;
}): Promise<IDiscussionBoardSection.ISummary> {
  // Query for the first active section sorted alphabetically by name
  // Note: The return type IDiscussionBoardSection.ISummary suggests a single section,
  // but specification mentions 'list of all available discussion board sections'.
  // Following the provided function signature exactly as required.
  const section =
    await MyGlobal.prisma.discussion_board_sections.findFirstOrThrow({
      where: {
        deleted_at: null,
      },
      orderBy: {
        name: "asc" as const,
      },
      ...DiscussionBoardSectionAtSummaryTransformer.select(),
    });
  return await DiscussionBoardSectionAtSummaryTransformer.transform(section);
}
