import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalDiscussionBoardUserAtSummaryTransformer } from "../transformers/EconomicPoliticalDiscussionBoardUserAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicPoliticalDiscussionBoardUsersId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalDiscussionBoardUser.ISummary> {
  const user =
    await MyGlobal.prisma.economic_political_discussion_board_users.findUniqueOrThrow(
      {
        where: { id: props.id },
        ...EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.select(),
      },
    );
  if (user.deleted_at) {
    throw new HttpException("User not found", 404);
  }
  return await EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.transform(
    user,
  );
}
