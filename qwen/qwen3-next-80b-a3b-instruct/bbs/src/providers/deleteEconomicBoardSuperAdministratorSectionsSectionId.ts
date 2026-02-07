import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEconomicBoardSuperAdministratorSectionsSectionId(props: {
  superAdministrator: SuperadministratorPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const section = await MyGlobal.prisma.economic_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!section || section.deleted_at !== null) {
    throw new HttpException("Section not found", 404);
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.economic_board_section_deletions.create({
    data: {
      id: v4(),
      section_id: props.sectionId,
      administrator_id: props.superAdministrator.id,
      created_at: now,
    },
  });
  await MyGlobal.prisma.economic_board_sections.update({
    where: { id: props.sectionId },
    data: {
      deleted_at: now,
      status: "deleted",
    },
  });
}
