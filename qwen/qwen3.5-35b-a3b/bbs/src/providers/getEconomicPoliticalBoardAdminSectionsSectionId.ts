import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalBoardSectionTransformer } from "../transformers/EconomicPoliticalBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicPoliticalBoardAdminSectionsSectionId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalBoardSection> {
  const section =
    await MyGlobal.prisma.economic_political_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
      ...EconomicPoliticalBoardSectionTransformer.select(),
    });
  return await EconomicPoliticalBoardSectionTransformer.transform(section);
}
