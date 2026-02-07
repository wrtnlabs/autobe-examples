import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEconomyPoliticsBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomyPoliticsBoardUserSessionTransformer } from "../transformers/EconomyPoliticsBoardUserSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomyPoliticsBoardUserSessionsSessionId(props: {
  user: UserPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEconomyPoliticsBoardUserSession> {
  const session =
    await MyGlobal.prisma.economy_politics_board_user_sessions.findUnique({
      where: {
        id: props.sessionId,
        user_id: props.user.id,
      },
      ...EconomyPoliticsBoardUserSessionTransformer.select(),
    });
  if (!session) throw new HttpException("Session not found", 404);
  return await EconomyPoliticsBoardUserSessionTransformer.transform(session);
}
