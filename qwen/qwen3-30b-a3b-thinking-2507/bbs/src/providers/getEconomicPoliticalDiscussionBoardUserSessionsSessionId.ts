import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEconomicPoliticalDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomicPoliticalDiscussionBoardUserSessionTransformer } from "../transformers/EconomicPoliticalDiscussionBoardUserSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicPoliticalDiscussionBoardUserSessionsSessionId(props: {
  user: UserPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalDiscussionBoardUserSession> {
  const session =
    await MyGlobal.prisma.economic_political_discussion_board_user_sessions.findUniqueOrThrow(
      {
        where: { id: props.sessionId },
        select: {
          ...EconomicPoliticalDiscussionBoardUserSessionTransformer.select()
            .select,
          user_id: true,
        },
      },
    );
  if (session.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  return EconomicPoliticalDiscussionBoardUserSessionTransformer.transform(
    session,
  );
}
