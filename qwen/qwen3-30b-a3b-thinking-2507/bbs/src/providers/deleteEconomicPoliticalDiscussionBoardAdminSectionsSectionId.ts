import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEconomicPoliticalDiscussionBoardAdminSectionsSectionId(props: {
  admin: AdminPayload;
  sectionId: string;
}): Promise<void> {
  const uncategorizedSection =
    await MyGlobal.prisma.economic_political_discussion_board_sections.findFirst(
      {
        where: {
          name: "Uncategorized",
          deleted_at: null,
        },
      },
    );
  if (!uncategorizedSection) {
    throw new HttpException("Default section not found", 404);
  }
  await MyGlobal.prisma.economic_political_discussion_board_articles.updateMany(
    {
      where: {
        section_id: props.sectionId,
        deleted_at: null,
      },
      data: {
        section_id: uncategorizedSection.id,
      },
    },
  );
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.economic_political_discussion_board_sections.update({
    where: {
      id: props.sectionId,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
    },
  });
}
