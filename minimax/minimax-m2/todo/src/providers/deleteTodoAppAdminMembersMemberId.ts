import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoAppAdminMembersMemberId(props: {
  admin: AdminPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<ITodoAppMember> {
  // Check if member exists
  const existingMember = await MyGlobal.prisma.todo_app_members.findUnique({
    where: { id: props.memberId },
  });

  if (!existingMember) {
    throw new HttpException("Member not found", 404);
  }

  // Perform soft delete by setting deleted_at timestamp
  const updatedMember = await MyGlobal.prisma.todo_app_members.update({
    where: { id: props.memberId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the deleted member in correct format
  return {
    id: updatedMember.id,
    email: updatedMember.email,
    first_name: updatedMember.first_name ?? undefined,
    last_name: updatedMember.last_name ?? undefined,
    status: updatedMember.status,
    created_at: toISOStringSafe(updatedMember.created_at),
    updated_at: toISOStringSafe(updatedMember.updated_at),
    deleted_at: updatedMember.deleted_at
      ? toISOStringSafe(updatedMember.deleted_at)
      : undefined,
  };
}
