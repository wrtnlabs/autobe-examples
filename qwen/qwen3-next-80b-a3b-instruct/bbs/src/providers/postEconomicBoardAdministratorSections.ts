import { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicBoardSectionCollector } from "../collectors/EconomicBoardSectionCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EconomicBoardSectionTransformer } from "../transformers/EconomicBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicBoardAdministratorSections(props: {
  administrator: AdministratorPayload;
  body: IEconomicBoardSection.ICreate;
}): Promise<IEconomicBoardSection> {
  // Normalize section name to title case (e.g., 'economy' -> 'Economy')
  const normalizedName = props.body.name
    .split(" ")
    .map(
      (word: string) =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
  // Check for existing active section with same (case-insensitive) name
  const existing = await MyGlobal.prisma.economic_board_sections.findFirst({
    where: {
      name: normalizedName,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException("Section name already exists", 409);
  }
  // Use collector to transform request to Prisma create input
  const createInput = await EconomicBoardSectionCollector.collect({
    body: { ...props.body, name: normalizedName },
  });
  // Create the section
  const created = await MyGlobal.prisma.economic_board_sections.create({
    data: createInput,
    ...EconomicBoardSectionTransformer.select(),
  });
  // Transform and return the result
  return await EconomicBoardSectionTransformer.transform(created);
}
