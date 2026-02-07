import { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomyPoliticsBoardSectionTransformer } from "../transformers/EconomyPoliticsBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomyPoliticsBoardSectionsSectionId(props: {
  sectionId: string & tags.Format<"uuid">;
}): Promise<IEconomyPoliticsBoardSection> {
  const section =
    await MyGlobal.prisma.economy_politics_board_sections.findUnique({
      where: { id: props.sectionId },
      ...EconomyPoliticsBoardSectionTransformer.select(),
    });
  if (!section) throw new HttpException("Section not found", 404);
  return await EconomyPoliticsBoardSectionTransformer.transform(section);
}
