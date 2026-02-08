import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardRegisteredUserRegisteredUsersId(props: {
  registeredUser: RegistereduserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardRegisteredUser> {
  const user =
    await MyGlobal.prisma.discussion_board_registered_users.findUnique({
      where: { id: props.id },
      select: {
        id: true,
        email: true,
        display_name: true,
        bio: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        password_hash: false, // explicitly exclude
      },
    });
  if (!user) {
    throw new HttpException("Registered user not found", 404);
  }
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4(),
      actor_id: props.registeredUser.id,
      created_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name ?? undefined,
    biography: user.bio ?? null,
    ban_status: user.is_banned,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
  };
}
