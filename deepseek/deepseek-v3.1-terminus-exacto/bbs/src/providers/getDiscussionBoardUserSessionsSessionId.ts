import { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardUserSessionTransformer } from "../transformers/DiscussionBoardUserSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserSessionsSessionId(props: {
  user: UserPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserSession> {
  // Verify that the session belongs to the authenticated user
  const session =
    await MyGlobal.prisma.discussion_board_user_sessions.findUnique({
      where: {
        id: props.sessionId,
        discussion_board_user_id: props.user.id, // Ensure session belongs to authenticated user
      },
      ...DiscussionBoardUserSessionTransformer.select(),
    });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  return await DiscussionBoardUserSessionTransformer.transform(session);
}
