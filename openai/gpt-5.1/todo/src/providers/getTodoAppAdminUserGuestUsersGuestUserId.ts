import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getTodoAppAdminUserGuestUsersGuestUserId(props: {
  adminUser: AdminuserPayload;
  guestUserId: string & tags.Format<"uuid">;
}): Promise<ITodoAppGuestUser> {
  // Fetch the guest user concept record by primary key (UUID id)
  const guestUser = await MyGlobal.prisma.todo_app_guestusers.findUnique({
    where: {
      id: props.guestUserId,
    },
  });

  if (guestUser === null) {
    throw new HttpException("Guest user not found", 404);
  }

  const baseResult: ITodoAppGuestUser = {
    id: guestUser.id,
    created_at: toISOStringSafe(guestUser.created_at),
    updated_at: toISOStringSafe(guestUser.updated_at),
  };

  // Handle optional external_ref mapping explicitly to satisfy
  // ITodoAppGuestUser.external_ref?: string | null | undefined
  if (guestUser.external_ref === null) {
    return baseResult;
  }

  return {
    ...baseResult,
    external_ref: guestUser.external_ref,
  };
}
