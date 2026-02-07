import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSectionsSectionId(props: {
  sectionId: string;
}): Promise<IDiscussionBoardSection> {
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  return {
    id: section.id as string & tags.Format<"uuid">,
    name: section.name,
    description: section.description,
    created_at: section.created_at ? toISOStringSafe(section.created_at) : null,
    updated_at: section.updated_at ? toISOStringSafe(section.updated_at) : null,
    deleted_at: section.deleted_at ? toISOStringSafe(section.deleted_at) : null,
  };
}
