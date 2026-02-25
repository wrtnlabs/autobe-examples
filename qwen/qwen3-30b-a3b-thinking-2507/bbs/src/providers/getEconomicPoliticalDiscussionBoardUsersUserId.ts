import { IEconomicPoliticalDiscussionBoardProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardProfile";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicPoliticalDiscussionBoardProfileTransformer } from "../transformers/EconomicPoliticalDiscussionBoardProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicPoliticalDiscussionBoardUsersUserId(props: {
  userId: string;
}): Promise<IEconomicPoliticalDiscussionBoardProfile> {
  const profile =
    await MyGlobal.prisma.economic_political_discussion_board_profiles.findUniqueOrThrow(
      {
        where: { user_id: props.userId },
        ...EconomicPoliticalDiscussionBoardProfileTransformer.select(),
      },
    );
  return await EconomicPoliticalDiscussionBoardProfileTransformer.transform(
    profile,
  );
}
