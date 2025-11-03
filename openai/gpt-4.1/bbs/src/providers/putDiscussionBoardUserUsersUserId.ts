import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putDiscussionBoardUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUser.IUpdate;
}): Promise<IDiscussionBoardUser> {
  // 1. Auth check
  if (props.user.id !== props.userId) {
    throw new HttpException("You may only update your own profile.", 403);
  }

  // 2. Find current user, ensure active
  const current = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: props.userId,
      is_locked: false,
      deleted_at: null,
    },
  });
  if (!current) {
    throw new HttpException("Profile not found or inactive.", 404);
  }

  // 3. Email uniqueness check (only if new email provided and changed)
  let updateEmail: string | undefined;
  if (
    props.body.email !== undefined &&
    props.body.email !== null &&
    props.body.email !== current.email
  ) {
    const other = await MyGlobal.prisma.discussion_board_users.findFirst({
      where: { email: props.body.email },
    });
    if (other && other.id !== current.id) {
      throw new HttpException("Email address already in use.", 409);
    }
    updateEmail = props.body.email;
  }

  // 4. Prepare update fields
  let hashedPassword: string | undefined;
  if (props.body.password !== undefined && props.body.password !== null) {
    hashedPassword = await PasswordUtil.hash(props.body.password);
  }

  // 5. Update allowed fields only
  const updated = await MyGlobal.prisma.discussion_board_users.update({
    where: { id: props.userId },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(updateEmail !== undefined && { email: updateEmail }),
      ...(hashedPassword !== undefined && { password_hash: hashedPassword }),
      ...(props.body.avatar_url !== undefined && {
        avatar_url: props.body.avatar_url,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 6. Assemble and return API DTO
  return {
    id: updated.id,
    email: updated.email,
    display_name: updated.display_name,
    avatar_url: updated.avatar_url !== null ? updated.avatar_url : undefined,
    is_locked: updated.is_locked,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
