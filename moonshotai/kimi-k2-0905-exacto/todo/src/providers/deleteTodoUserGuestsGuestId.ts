import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

// 🔍 DIRECT HARD DELETE IMPLEMENTATION
// Rational: Schema has no deleted_at field → hard delete is correct
// Cascade: guest_sessions auto-deleted via CASCADE relation
// Performance: Single operation with built-in error handling

export async function deleteTodoUserGuestsGuestId(props: {
  user: UserPayload;
  guestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { guestId } = props;

  // Single operation - will throw if guest not found
  // CASCADE automatically removes related todo_guest_sessions
  await MyGlobal.prisma.todo_guests.delete({
    where: { id: guestId },
  });
}
