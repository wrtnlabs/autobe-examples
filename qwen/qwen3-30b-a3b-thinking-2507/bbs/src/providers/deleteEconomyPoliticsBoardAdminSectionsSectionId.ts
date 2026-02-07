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

export async function deleteEconomyPoliticsBoardAdminSectionsSectionId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const section =
    await MyGlobal.prisma.economy_politics_board_sections.findUnique({
      where: { id: props.sectionId },
    });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  if (section.deleted_at !== null) {
    throw new HttpException("Section is already deleted", 404);
  }
  await MyGlobal.prisma.economy_politics_board_sections.update({
    where: { id: props.sectionId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
