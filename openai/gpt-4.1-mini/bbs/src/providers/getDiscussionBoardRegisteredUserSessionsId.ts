import { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardRegisteredUserSessionsId(props: {
  registeredUser: RegistereduserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardRegisteredUserSession> {
  const session =
    await MyGlobal.prisma.discussion_board_registered_user_sessions.findUnique({
      where: { id: props.id },
    });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  // Log access for auditing (implementation depends on logging infrastructure)
  // await MyGlobal.logger.info(`RegisteredUser ${props.registeredUser.id} accessed session ${props.id}`);
  return {
    id: session.id,
    registered_user_id: session.registered_user_id,
    client_ip: session.ip,
    request_uri: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: toISOStringSafe(session.expired_at),
  };
}
