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

export async function putTodoAppGuestGuestsGuestId(props: {
  guest: GuestPayload;
  guestId: string & tags.Format<"uuid">;
  body: ITodoAppGuest.IUpdate;
}): Promise<ITodoAppGuest> {
  // Authorization: guests can only update their own record
  if (props.guest.id !== props.guestId) {
    throw new HttpException("Forbidden: Cannot update other guests' data", 403);
  }
  // Find existing guest
  const existing = await MyGlobal.prisma.todo_app_guests.findUnique({
    where: { id: props.guestId },
  });
  if (existing === null) {
    throw new HttpException("Guest not found", 404);
  }
  // Prepare update data
  const updateData: Prisma.todo_app_guestsUpdateInput = {};
  if (props.body.guest_identifier !== undefined) {
    updateData.guest_identifier = props.body.guest_identifier;
  }
  // Perform update
  const updated = await MyGlobal.prisma.todo_app_guests.update({
    where: { id: props.guestId },
    data: updateData,
  });
  // Use transformer for consistent DTO conversion
  return await TodoAppGuestTransformer.transform(updated);
}
