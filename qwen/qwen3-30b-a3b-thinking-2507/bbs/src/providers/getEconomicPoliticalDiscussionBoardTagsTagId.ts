import { IEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalDiscussionBoardTagTransformer } from "../transformers/EconomicPoliticalDiscussionBoardTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicPoliticalDiscussionBoardTagsTagId(props: {
  tagId: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalDiscussionBoardTag> {
  const tag =
    await MyGlobal.prisma.economic_political_discussion_board_tags.findUniqueOrThrow(
      {
        where: { id: props.tagId },
        ...EconomicPoliticalDiscussionBoardTagTransformer.select(),
      },
    );
  return await EconomicPoliticalDiscussionBoardTagTransformer.transform(tag);
}
