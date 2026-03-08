import { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalBoardTagTransformer } from "../transformers/EconomicPoliticalBoardTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicPoliticalBoardTagsTagId(props: {
  tagId: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalBoardTag> {
  const tag =
    await MyGlobal.prisma.economic_political_board_tags.findUniqueOrThrow({
      where: {
        id: props.tagId,
        deleted_at: null,
      },
      ...EconomicPoliticalBoardTagTransformer.select(),
    });
  return await EconomicPoliticalBoardTagTransformer.transform(tag);
}
