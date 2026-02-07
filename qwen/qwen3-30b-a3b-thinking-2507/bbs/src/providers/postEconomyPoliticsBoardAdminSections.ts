import { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomyPoliticsBoardSectionCollector } from "../collectors/EconomyPoliticsBoardSectionCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomyPoliticsBoardSectionTransformer } from "../transformers/EconomyPoliticsBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomyPoliticsBoardAdminSections(props: {
  admin: AdminPayload;
  body: IEconomyPoliticsBoardSection.ICreate;
}): Promise<IEconomyPoliticsBoardSection> {
  const created = await MyGlobal.prisma.economy_politics_board_sections.create({
    data: await EconomyPoliticsBoardSectionCollector.collect({
      body: props.body,
    }),
  });
  return await EconomyPoliticsBoardSectionTransformer.transform(created);
}
