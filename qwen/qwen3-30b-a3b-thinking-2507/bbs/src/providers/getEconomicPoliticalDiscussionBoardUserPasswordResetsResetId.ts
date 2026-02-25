import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEconomicPoliticalDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomicPoliticalDiscussionBoardUserPasswordResetTransformer } from "../transformers/EconomicPoliticalDiscussionBoardUserPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicPoliticalDiscussionBoardUserPasswordResetsResetId(props: {
  user: UserPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalDiscussionBoardUserPasswordReset> {
  const reset =
    await MyGlobal.prisma.economic_political_discussion_board_user_password_resets.findUniqueOrThrow(
      {
        where: { id: props.resetId },
        ...EconomicPoliticalDiscussionBoardUserPasswordResetTransformer.select(),
      },
    );
  return EconomicPoliticalDiscussionBoardUserPasswordResetTransformer.transform(
    reset,
  );
}
