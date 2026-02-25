import { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalDiscussionBoardSectionTransformer } from "../transformers/EconomicPoliticalDiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicPoliticalDiscussionBoardSectionsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalDiscussionBoardSection> {
  const section =
    await MyGlobal.prisma.economic_political_discussion_board_sections.findUniqueOrThrow(
      {
        where: { id: props.id, deleted_at: null },
        ...EconomicPoliticalDiscussionBoardSectionTransformer.select(),
      },
    );
  return await EconomicPoliticalDiscussionBoardSectionTransformer.transform(
    section,
  );
}
