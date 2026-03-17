import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { MultiUserTodoMemberTransformer } from "../transformers/MultiUserTodoMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMultiUserTodoGuestProfile(props: {
  guest: GuestPayload;
  body: IMultiUserTodoMember.IUpdate;
}): Promise<IMultiUserTodoMember> {
  // Verify member exists and is not soft-deleted
  const member =
    await MyGlobal.prisma.multi_user_todo_members.findUniqueOrThrow({
      where: { id: props.guest.id },
      select: { deleted_at: true },
    });
  // Reject if account is soft-deleted
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Update profile fields conditionally
  await MyGlobal.prisma.multi_user_todo_members.update({
    where: { id: props.guest.id },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.nickname !== undefined && {
        nickname: props.body.nickname,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch updated record with transformer select
  const updated =
    await MyGlobal.prisma.multi_user_todo_members.findUniqueOrThrow({
      where: { id: props.guest.id },
      ...MultiUserTodoMemberTransformer.select(),
    });
  // Transform to DTO format
  return await MultiUserTodoMemberTransformer.transform(updated);
}
