import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomicForumUserSessionCollector } from "../collectors/EconomicForumUserSessionCollector";

export async function postEconomicForumUserAuthUsersSessions(props: {
  user: UserPayload;
  body: IEconomicForumUserSession.ICreate;
}): Promise<IEconomicForumUserSession> {
  const session = await MyGlobal.prisma.economic_forum_user_sessions.create({
    data: await EconomicForumUserSessionCollector.collect({
      body: props.body,
      economicForumUsers: { id: props.user.id },
      economicForumUserSessions: { id: props.user.session_id },
      ip: "", // Provided fallback empty string - UserPayload does not have ip property
    }),
  });
  const expiresAt = toISOStringSafe(session.created_at);
  return {
    token: session.id as string & tags.Format<"uuid">,
    expiresAt: expiresAt as string & tags.Format<"date-time">,
  };
}
