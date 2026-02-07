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

export async function deleteEconomicBoardAdministratorSectionsSectionId(props: {
  administrator: AdministratorPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Query the section by ID and ensure it's active (not deleted)
    const section = await prisma.economic_board_sections.findUnique({
      where: {
        id: props.sectionId,
        deleted_at: null,
      },
    });
    // If section not found or already deleted, return 404
    if (!section) {
      throw new HttpException("Section not found", 404);
    }
    // Record the deletion event in the audit log
    await prisma.economic_board_section_deletions.create({
      data: {
        id: v4(),
        section_id: props.sectionId,
        administrator_id: props.administrator.id,
        created_at: toISOStringSafe(new Date()),
      },
    });
    // Update the section to mark it as deleted
    await prisma.economic_board_sections.update({
      where: { id: props.sectionId },
      data: {
        deleted_at: toISOStringSafe(new Date()),
        status: "deleted",
      },
    });
  });
}
