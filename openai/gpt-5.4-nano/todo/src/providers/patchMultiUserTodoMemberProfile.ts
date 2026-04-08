import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberProfile(props: {
  member: MemberPayload;
  body: IMultiUserTodoUserProfile.IUpdate;
}): Promise<IMultiUserTodoUserProfile> {
  const displayName: string = props.body.display_name.trim();
  if (displayName.length < 1) {
    throw new HttpException("display_name must not be empty", 400);
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.multi_user_todo_user_profiles.findFirstOrThrow({
      where: {
        multi_user_todo_user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        multi_user_todo_user_id: true,
        display_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    return await tx.multi_user_todo_user_profiles.update({
      where: { id: existing.id },
      data: {
        display_name: displayName,
        updated_at: existing.updated_at,
      },
      select: {
        id: true,
        multi_user_todo_user_id: true,
        display_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  });
  return {
    id: updated.id,
    multi_user_todo_user_id: updated.multi_user_todo_user_id,
    display_name: updated.display_name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
