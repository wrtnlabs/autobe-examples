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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EconomicBoardSectionTransformer } from "../transformers/EconomicBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicBoardSuperAdministratorSections(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEconomicBoardSection.ICreate;
}): Promise<IEconomicBoardSection> {
  const created = await MyGlobal.prisma.economic_board_sections.create({
    data: await EconomicBoardSectionCollector.collect({
      body: props.body,
    }),
    ...EconomicBoardSectionTransformer.select(),
  });
  return await EconomicBoardSectionTransformer.transform(created);
}
