import { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalDiscussionBoardSectionCollector } from "../collectors/EconomicPoliticalDiscussionBoardSectionCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalDiscussionBoardSectionTransformer } from "../transformers/EconomicPoliticalDiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicPoliticalDiscussionBoardAdminSections(props: {
  admin: AdminPayload;
  body: IEconomicPoliticalDiscussionBoardSection.ICreate;
}): Promise<IEconomicPoliticalDiscussionBoardSection> {
  const existing =
    await MyGlobal.prisma.economic_political_discussion_board_sections.findUnique(
      {
        where: { name: props.body.name },
      },
    );
  if (existing) {
    throw new HttpException("Section name already exists", 409);
  }
  const created =
    await MyGlobal.prisma.economic_political_discussion_board_sections.create({
      data: await EconomicPoliticalDiscussionBoardSectionCollector.collect({
        body: props.body,
      }),
      ...EconomicPoliticalDiscussionBoardSectionTransformer.select(),
    });
  return await EconomicPoliticalDiscussionBoardSectionTransformer.transform(
    created,
  );
}
