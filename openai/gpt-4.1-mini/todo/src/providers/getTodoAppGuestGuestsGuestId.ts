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
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { TodoAppGuestTransformer } from "../transformers/TodoAppGuestTransformer";

export async function getTodoAppGuestGuestsGuestId(props: {
  guest: GuestPayload;
  guestId: string & tags.Format<"uuid">;
}): Promise<ITodoAppGuest> {
  const guestRecord = await MyGlobal.prisma.todo_app_guests.findUnique({
    where: { id: props.guestId },
    ...TodoAppGuestTransformer.select(),
  });
  if (guestRecord === null) {
    throw new HttpException("Guest not found", 404);
  }
  return await TodoAppGuestTransformer.transform(guestRecord);
}
