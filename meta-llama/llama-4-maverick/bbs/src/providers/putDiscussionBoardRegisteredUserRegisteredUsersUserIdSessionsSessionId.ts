import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

```typescript

export async function putDiscussionBoardRegisteredUserRegisteredUsersUserIdSessionsSessionId(props: {
  registeredUser: RegisteredUserPayload;
  userId: string & tags.Format<'uuid'>;
  sessionId: string & tags.Format<'uuid'>;
  body: IDiscussionBoardRegisteredUserSession.IUpdate;
}): Promise<IDiscussionBoardRegisteredUserSession> {
  const existingSession = await MyGlobal.prisma.discussion_board_registered_user_sessions.findFirst({
    where: { id: props.sessionId, registered_user_id: props.userId },
  });
  if (!existingSession) throw new HttpException("Session not found", 404);
  if (existingSession.registered_user_id !== props.registeredUser.id) throw new HttpException("Forbidden", 403);

  let updateData: IDiscussionBoardRegisteredUserSession.IDeviceInfo | null = null;
  try {
    updateData = JSON.parse(props.body !== null && props.body !== void 0 ? props.body : "null");
  } catch (error) {
    throw new HttpException("Invalid update data", 400);
  }

  const updatedSession = await MyGlobal.prisma.discussion_board_registered_user_sessions.update({
    where: { id: props.sessionId },
    data: updateData !== null ? updateData : {},
  });

  return {
    id: updatedSession.id,
    userId: updatedSession.registered_user_id,
    createdAt: toISOStringSafe(updatedSession.created_at),
    lastActivity: toISOStringSafe(updatedSession.created_at),
    status: "active",
    deviceInfo: updateData !== null ? typia.assert<IDiscussionBoardRegisteredUserSession['deviceInfo']>(updateData) : undefined,
  };
}
```;
