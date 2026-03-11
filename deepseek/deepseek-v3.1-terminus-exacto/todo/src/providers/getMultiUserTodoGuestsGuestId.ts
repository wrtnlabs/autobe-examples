import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoGuestTransformer } from "../transformers/MultiUserTodoGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoGuest> {
  // Fetch guest with transformer select, ensuring not deleted
  const guest = await MyGlobal.prisma.multi_user_todo_guests.findUniqueOrThrow({
    where: {
      id: props.guestId,
      deleted_at: null, // Ensure not soft-deleted
    },
    ...MultiUserTodoGuestTransformer.select(),
  });
  // Transform to DTO format
  return await MultiUserTodoGuestTransformer.transform(guest);
}
