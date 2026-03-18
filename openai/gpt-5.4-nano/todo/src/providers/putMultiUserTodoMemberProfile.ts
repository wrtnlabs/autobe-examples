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

export async function putMultiUserTodoMemberProfile(props: {
  member: MemberPayload;
  body: IMultiUserTodoUserProfile.IUpdate;
}): Promise<IMultiUserTodoUserProfile> {
  const actingMemberId = props.member.id;
  const profile =
    await MyGlobal.prisma.multi_user_todo_user_profiles.findFirstOrThrow({
      where: {
        multi_user_todo_member_id: actingMemberId,
        deleted_at: null,
      },
      select: {
        id: true,
        display_name: true,
        multi_user_todo_member_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  await MyGlobal.prisma.multi_user_todo_user_profiles.update({
    where: { id: profile.id },
    data: {
      display_name: props.body.displayName,
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.multi_user_todo_user_profiles.findUniqueOrThrow({
      where: { id: profile.id },
      select: {
        id: true,
        display_name: true,
        multi_user_todo_member_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: updated.id,
    displayName: updated.display_name,
    memberId: updated.multi_user_todo_member_id,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    deletedAt: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
