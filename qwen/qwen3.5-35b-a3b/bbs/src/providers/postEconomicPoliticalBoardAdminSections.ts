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
import { EconomicPoliticalBoardSectionCollector } from "../collectors/EconomicPoliticalBoardSectionCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalBoardSectionTransformer } from "../transformers/EconomicPoliticalBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalBoardAdminSections(props: {
  admin: AdminPayload;
  body: IEconomicPoliticalBoardSection.ICreate;
}): Promise<IEconomicPoliticalBoardSection> {
  // Validate name is not empty or whitespace-only
  if (!props.body.name || props.body.name.trim().length === 0) {
    throw new HttpException("Name cannot be empty or whitespace-only", 400);
  }
  // Validate description is present (required field per operation specification)
  if (props.body.description === undefined) {
    throw new HttpException("Description is required", 400);
  }
  // Check for duplicate section name (case-sensitive unique constraint)
  const existing =
    await MyGlobal.prisma.economic_political_board_sections.findUnique({
      where: { name: props.body.name },
    });
  if (existing !== null) {
    throw new HttpException("Section name already exists", 409);
  }
  // Create section using collector for data transformation
  const created =
    await MyGlobal.prisma.economic_political_board_sections.create({
      data: await EconomicPoliticalBoardSectionCollector.collect({
        body: props.body,
      }),
      ...EconomicPoliticalBoardSectionTransformer.select(),
    });
  // Transform database record to API response
  return await EconomicPoliticalBoardSectionTransformer.transform(created);
}
