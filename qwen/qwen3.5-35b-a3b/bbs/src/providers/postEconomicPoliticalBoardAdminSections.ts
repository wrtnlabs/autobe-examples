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
import { EconomicPoliticalBoardSectionCollector } from "../collectors/EconomicPoliticalBoardSectionCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalBoardSectionTransformer } from "../transformers/EconomicPoliticalBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalBoardAdminSections(props: {
  admin: AdminPayload;
  body: IEconomicPoliticalBoardSection.ICreate;
}): Promise<IEconomicPoliticalBoardSection> {
  const trimmedName = props.body.name.trim();
  if (trimmedName.length === 0) {
    throw new HttpException("Section name cannot be empty", 400);
  }
  const existingSection =
    await MyGlobal.prisma.economic_political_board_sections.findUnique({
      where: { name: trimmedName },
    });
  if (existingSection !== null && existingSection.deleted_at === null) {
    throw new HttpException("Section name already exists", 409);
  }
  const createdSection =
    await MyGlobal.prisma.economic_political_board_sections.create({
      data: await EconomicPoliticalBoardSectionCollector.collect({
        body: {
          name: trimmedName,
          description: props.body.description,
        },
      }),
      ...EconomicPoliticalBoardSectionTransformer.select(),
    });
  return await EconomicPoliticalBoardSectionTransformer.transform(
    createdSection,
  );
}
