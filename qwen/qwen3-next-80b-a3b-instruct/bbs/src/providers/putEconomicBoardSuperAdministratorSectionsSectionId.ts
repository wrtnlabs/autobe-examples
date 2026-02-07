import { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
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

export async function putEconomicBoardSuperAdministratorSectionsSectionId(props: {
  superAdministrator: SuperadministratorPayload;
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
  // Validate that the update object has required data even though IUpdate is empty in schema
  // According to specification, both name and description are required for update
  const updatedBody = typia.assert<
    IEconomicBoardSection.IUpdate & {
      name: string;
      description?: string;
    }
  >(props.body);
  if (!updatedBody.name || updatedBody.name.trim().length === 0) {
    throw new HttpException("Section name cannot be empty", 400);
  }
  if (updatedBody.name.trim().length > 256) {
    throw new HttpException(
      "Section name exceeds maximum length of 256 characters",
      400,
    );
  }
  if (updatedBody.description && updatedBody.description.length > 1000) {
    throw new HttpException(
      "Description exceeds maximum length of 1000 characters",
      400,
    );
  }
  // Check for name uniqueness (case-insensitive)
  const existingSection =
    await MyGlobal.prisma.economic_board_sections.findFirst({
      where: {
        id: { not: props.sectionId },
        name: { equals: updatedBody.name, mode: "insensitive" },
      },
    });
  if (existingSection) {
    throw new HttpException("SECTION_NAME_EXISTS", 400);
  }
  await MyGlobal.prisma.economic_board_sections.update({
    where: { id: props.sectionId },
    data: {
      name: updatedBody.name,
      description: updatedBody.description,
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
