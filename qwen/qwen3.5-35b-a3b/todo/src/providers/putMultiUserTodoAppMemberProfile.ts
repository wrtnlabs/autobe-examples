import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
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

export async function putMultiUserTodoAppMemberProfile(props: {
  member: MemberPayload;
  body: IMultiUserTodoAppMember.IUpdate;
}): Promise<IMultiUserTodoAppMember> {
  // IUpdate is empty, so no updateable fields exist
  // Return current profile by reading the member
  const member =
    await MyGlobal.prisma.multi_user_todo_app_members.findUniqueOrThrow({
      where: { id: props.member.id },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
      },
    });
  return {
    id: member.id,
    createdAt: toISOStringSafe(member.created_at),
    updatedAt: toISOStringSafe(member.updated_at),
    displayName: member.email,
  };
}
