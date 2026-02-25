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
  sectionId: string;
}): Promise<void> {
  const sectionId = props.sectionId as string & tags.Format<"uuid">;
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: {
        id: sectionId,
      },
    });
  const articleCount = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      section_id: sectionId,
      deleted_at: null,
    },
  });
  if (articleCount > 0) {
    throw new HttpException(
      "Section contains articles. Move or delete articles first.",
      409,
    );
  }
  await MyGlobal.prisma.discussion_board_sections.delete({
    where: {
      id: sectionId,
    },
  });
}
