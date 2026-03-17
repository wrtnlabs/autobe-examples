import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteMultiUserTodoMemberAccount(props: {
  member: MemberPayload;
}): Promise<void> {
  // Verify member exists
  await MyGlobal.prisma.multi_user_todo_members.findUniqueOrThrow({
    where: { id: props.member.id },
    select: { id: true },
  });
  // Delete member - cascading relations handle all associated data
  await MyGlobal.prisma.multi_user_todo_members.delete({
    where: { id: props.member.id },
  });
}
