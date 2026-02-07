import { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicBoardSectionTransformer } from "../transformers/EconomicBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicBoardSectionsSectionId(props: {
  sectionId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardSection> {
  const section = await MyGlobal.prisma.economic_board_sections.findUnique({
    where: { id: props.sectionId },
    ...EconomicBoardSectionTransformer.select(),
  });
  if (!section || section.deleted_at !== null) {
    throw new HttpException("Section not found", 404);
  }
  return await EconomicBoardSectionTransformer.transform(section);
}
