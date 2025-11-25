import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteTodoAppMemberMembersMemberId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<ITodoAppMember> {
  // Verify authorization - member can only delete their own account
  if (props.member.id !== props.memberId) {
    throw new HttpException(
      "Forbidden - you can only delete your own account",
      403,
    );
  }

  // Check if member exists and is not already deleted
  const existing = await MyGlobal.prisma.todo_app_members.findUnique({
    where: { id: props.memberId },
  });

  if (!existing) {
    throw new HttpException("Member not found", 404);
  }

  if (existing.deleted_at !== null) {
    throw new HttpException("Member account is already deleted", 400);
  }

  // Perform soft deletion by setting deleted_at timestamp
  const deleted = await MyGlobal.prisma.todo_app_members.update({
    where: { id: props.memberId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Return deleted member with proper type conversion
  // Convert null deleted_at to undefined to match ITodoAppMember interface
  return {
    id: deleted.id,
    email: deleted.email,
    first_name: deleted.first_name ?? undefined,
    last_name: deleted.last_name ?? undefined,
    status: deleted.status,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
    deleted_at:
      deleted.deleted_at === null
        ? undefined
        : toISOStringSafe(deleted.deleted_at),
  };
}
