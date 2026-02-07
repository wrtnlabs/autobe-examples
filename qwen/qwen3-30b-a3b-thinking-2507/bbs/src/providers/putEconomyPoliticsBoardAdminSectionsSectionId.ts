import { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomyPoliticsBoardSectionTransformer } from "../transformers/EconomyPoliticsBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomyPoliticsBoardAdminSectionsSectionId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IEconomyPoliticsBoardSection.IUpdate;
}): Promise<IEconomyPoliticsBoardSection> {
  const section =
    await MyGlobal.prisma.economy_politics_board_sections.findUnique({
      where: { id: props.sectionId },
    });
  if (!section) throw new HttpException("Section not found", 404);
  // Check name uniqueness (if provided)
  if (props.body.name !== undefined) {
    const existingSection =
      await MyGlobal.prisma.economy_politics_board_sections.findFirst({
        where: { name: props.body.name, id: { not: props.sectionId } },
      });
    if (existingSection) {
      throw new HttpException("Section name must be unique", 400);
    }
  }
  // Check description minimum length (if provided)
  if (props.body.description !== undefined) {
    if (props.body.description.length < 20) {
      throw new HttpException(
        "Description must be at least 20 characters",
        400,
      );
    }
  }
  // Prepare the update data
  const updateData = {
    ...(props.body.name !== undefined ? { name: props.body.name } : {}),
    ...(props.body.description !== undefined
      ? { description: props.body.description }
      : {}),
    updated_at: toISOStringSafe(new Date()),
  };
  const updatedSection =
    await MyGlobal.prisma.economy_politics_board_sections.update({
      where: { id: props.sectionId },
      data: updateData,
      ...EconomyPoliticsBoardSectionTransformer.select(),
    });
  return await EconomyPoliticsBoardSectionTransformer.transform(updatedSection);
}
