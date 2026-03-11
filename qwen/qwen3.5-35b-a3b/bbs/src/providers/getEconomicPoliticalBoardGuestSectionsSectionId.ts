import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { EconomicPoliticalBoardSectionTransformer } from "../transformers/EconomicPoliticalBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicPoliticalBoardGuestSectionsSectionId(props: {
  guest: GuestPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalBoardSection> {
  const section =
    await MyGlobal.prisma.economic_political_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
      ...EconomicPoliticalBoardSectionTransformer.select(),
    });
  if (section.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  return await EconomicPoliticalBoardSectionTransformer.transform(section);
}
