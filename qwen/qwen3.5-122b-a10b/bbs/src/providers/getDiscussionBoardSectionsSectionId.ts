import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSectionsSectionId(props: {
  sectionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSection> {
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId, deleted_at: null },
      ...DiscussionBoardSectionTransformer.select(),
    });
  return await DiscussionBoardSectionTransformer.transform(section);
}
