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

export async function putTodoAppGuestGuestsGuestIdSessionsSessionId(props: {
  guest: GuestPayload;
  guestId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: ITodoAppGuestSession.IUpdate;
}): Promise<ITodoAppGuestSession> {
  const existing = await MyGlobal.prisma.todo_app_guest_sessions.findUnique({
    where: { id: props.sessionId },
  });
  if (!existing || existing.guest_id !== props.guestId) {
    throw new HttpException("Guest session not found", 404);
  }
  const updated = await MyGlobal.prisma.todo_app_guest_sessions.update({
    where: { id: props.sessionId },
    data: {
      ip: props.body.ip === null ? undefined : (props.body.ip ?? undefined),
      href:
        props.body.href === null ? undefined : (props.body.href ?? undefined),
      referrer:
        props.body.referrer === null
          ? undefined
          : (props.body.referrer ?? undefined),
      expired_at:
        props.body.expired_at === null
          ? undefined
          : props.body.expired_at === undefined
            ? undefined
            : toISOStringSafe(props.body.expired_at),
    },
  });
  return await TodoAppGuestSessionTransformer.transform({
    ...updated,
    guest: { id: existing.guest_id },
  });
}
