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
import { EconomicBoardSectionTransformer } from "../transformers/EconomicBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomicBoardAdministratorSectionsSectionId(props: {
  administrator: AdministratorPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IEconomicBoardSection.IUpdate;
}): Promise<IEconomicBoardSection> {
  const existing = await MyGlobal.prisma.economic_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Section not found", 404);
  }
  if (props.body.name !== undefined) {
    const conflict = await MyGlobal.prisma.economic_board_sections.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
        id: { not: props.sectionId },
      },
    });
    if (conflict) {
      throw new HttpException("Section name already exists", 400);
    }
  }
  await MyGlobal.prisma.economic_board_sections.update({
    where: { id: props.sectionId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updated = await MyGlobal.prisma.economic_board_sections.findUnique({
    where: { id: props.sectionId },
    include: {
      articles: true,
      snapshots: true,
    },
  });
  if (!updated) {
    throw new HttpException("Section not found after update", 500);
  }
  return EconomicBoardSectionTransformer.transform(updated);
}
