import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteTodoMemberMembersMemberId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Authorization check - member can only delete their own account
  if (props.member.id !== props.memberId) {
    throw new HttpException(
      "Unauthorized: You can only delete your own account",
      403,
    );
  }

  // Verify the member exists before attempting deletion
  const member = await MyGlobal.prisma.todo_member.findUnique({
    where: { id: props.memberId },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  // Perform hard delete - schema has no soft delete fields (checked in schema)
  // Cascade deletion of todos happens automatically through foreign key constraints
  await MyGlobal.prisma.todo_member.delete({
    where: { id: props.memberId },
  });
}
