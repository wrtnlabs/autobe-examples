import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { IDiscussionBoardBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanHistory";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardBanHistoryTransformer } from "../transformers/DiscussionBoardBanHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardBanHistoriesBanHistoryId(props: {
  banHistoryId: string;
}): Promise<IDiscussionBoardBanHistory> {
  const history =
    await MyGlobal.prisma.discussion_board_ban_histories.findUniqueOrThrow({
      where: { id: props.banHistoryId },
      ...DiscussionBoardBanHistoryTransformer.select(),
    });
  return await DiscussionBoardBanHistoryTransformer.transform(history);
}
