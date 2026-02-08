import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdministratorSectionsSectionId(props: {
  administrator: AdministratorPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (section === null) {
    throw new HttpException("Section not found", 404);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.discussion_board_sections.delete({
      where: { id: props.sectionId },
    });
    await prisma.discussion_board_section_admin_logs.create({
      data: {
        id: v4(),
        section_id: props.sectionId,
        administrator_id: props.administrator.id,
        action_type: "",
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  });
}
