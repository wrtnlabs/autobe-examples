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
import { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { TodoAppGuestSessionTransformer } from "../transformers/TodoAppGuestSessionTransformer";

export async function getTodoAppGuestGuestsGuestIdSessionsSessionId(props: {
  guest: GuestPayload;
  guestId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppGuestSession> {
  const session = await MyGlobal.prisma.todo_app_guest_sessions.findUnique({
    where: {
      id: props.sessionId,
      guest_id: props.guestId,
    },
    ...TodoAppGuestSessionTransformer.select(),
  });
  if (!session) {
    throw new HttpException("Guest session not found", 404);
  }
  return await TodoAppGuestSessionTransformer.transform(session);
}
