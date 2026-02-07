import { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
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

export async function putEconomicBoardAdministratorSectionsSectionId(props: {
  administrator: AdministratorPayload;
  sectionId: string;
  body: IEconomicBoardSection.IUpdate;
}): Promise<void> {
  const section = await MyGlobal.prisma.economic_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  if (section.status !== "active") {
    throw new HttpException("Section is not active", 400);
  }
  // Check name uniqueness case-insensitive across all sections
  const existingSection =
    await MyGlobal.prisma.economic_board_sections.findFirst({
      where: {
        id: { not: props.sectionId },
        name: { equals: props.body.name, mode: "insensitive" },
      },
    });
  if (existingSection) {
    throw new HttpException("SECTION_NAME_EXISTS", 409);
  }
  // Update the record using actual database field names, since IUpdate is empty but schema is authoritative
  await MyGlobal.prisma.economic_board_sections.update({
    where: { id: props.sectionId },
    data: {
      name: props.body.name,
      description: props.body.description,
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
