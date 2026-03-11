import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppGuestTransformer } from "../transformers/TodoAppGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<ITodoAppGuest> {
  const guest = await MyGlobal.prisma.todo_app_guests.findUniqueOrThrow({
    where: { id: props.guestId },
    ...TodoAppGuestTransformer.select(),
  });
  return await TodoAppGuestTransformer.transform(guest);
}
