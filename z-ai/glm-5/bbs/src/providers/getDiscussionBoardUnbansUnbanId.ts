import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { IDiscussionBoardUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUnban";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardUnbanTransformer } from "../transformers/DiscussionBoardUnbanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUnbansUnbanId(props: {
  unbanId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUnban> {
  const unban = await MyGlobal.prisma.discussion_board_unbans.findFirstOrThrow({
    where: {
      id: props.unbanId,
      deleted_at: null,
    },
    ...DiscussionBoardUnbanTransformer.select(),
  });
  return await DiscussionBoardUnbanTransformer.transform(unban);
}
