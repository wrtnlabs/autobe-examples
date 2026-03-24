import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppGuestSessionAtInvertTransformer } from "../transformers/TodoAppGuestSessionAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppGuests(props: {
  body: ITodoAppGuest.IUpdate;
}): Promise<ITodoAppGuestSession.IInvert> {
  const now = toISOStringSafe(new Date());
  const expired_at = toISOStringSafe(new Date(Date.now() + 1000 * 60 * 60));
  const sessionId = v4();
  const guestId = v4();
  return await TodoAppGuestSessionAtInvertTransformer.transform(
    await MyGlobal.prisma.todo_app_guest_sessions.create({
      data: {
        id: sessionId,
        created_at: now,
        updated_at: now,
        expired_at,
        ip: props.body.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        guest: {
          connectOrCreate: {
            where: { device_identifier: props.body.deviceIdentifier },
            create: {
              id: guestId,
              device_identifier: props.body.deviceIdentifier,
              created_at: now,
              updated_at: now,
            },
          },
        },
      },
      ...TodoAppGuestSessionAtInvertTransformer.select(),
    }),
  );
}
