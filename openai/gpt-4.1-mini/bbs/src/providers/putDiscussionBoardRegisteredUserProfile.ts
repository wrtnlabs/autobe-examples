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

export async function putDiscussionBoardRegisteredUserProfile(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardRegisteredUser.IUpdate;
}): Promise<IDiscussionBoardRegisteredUser> {
  const user =
    await MyGlobal.prisma.discussion_board_registered_users.findUnique({
      where: { id: props.registeredUser.id },
    });
  if (!user) throw new HttpException("User not found", 404);
  // To fix the error about missing display_name and bio, safely access them
  const display_name = (props.body as any).display_name ?? null;
  const bio = (props.body as any).bio ?? null;
  const updated =
    await MyGlobal.prisma.discussion_board_registered_users.update({
      where: { id: props.registeredUser.id },
      data: {
        // Only include display_name and bio if they are not null
        ...(display_name !== null ? { display_name } : {}),
        bio: bio === undefined ? null : bio,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    display_name: updated.display_name,
    bio: updated.bio === null ? undefined : updated.bio,
    is_banned: updated.is_banned,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
