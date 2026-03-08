import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminSectionsSectionId(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
    select: { id: true, name: true },
  });
  if (section === null) {
    throw new HttpException("Section not found", 404);
  }
  const articleCount = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      section_id: props.sectionId,
      deleted_at: null,
    },
  });
  if (articleCount > 0) {
    throw new HttpException(
      `Cannot delete section with ${articleCount} articles. Move or delete articles first.`,
      400,
    );
  }
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: props.sectionId },
    data: { deleted_at: now },
  });
}
