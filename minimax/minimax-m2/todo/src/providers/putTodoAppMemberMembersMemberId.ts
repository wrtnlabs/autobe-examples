import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putTodoAppMemberMembersMemberId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: ITodoAppMember.IUpdate;
}): Promise<ITodoAppMember> {
  // Verify member can only update their own profile
  if (props.member.id !== props.memberId) {
    throw new HttpException("Cannot update another member profile", 403);
  }

  // Check if member exists and is active
  const existingMember = await MyGlobal.prisma.todo_app_members.findUnique({
    where: { id: props.memberId },
  });

  if (!existingMember) {
    throw new HttpException("Member not found", 404);
  }

  if (existingMember.deleted_at !== null) {
    throw new HttpException("Cannot update deleted member account", 400);
  }

  if (existingMember.status !== "active") {
    throw new HttpException("Cannot update inactive member account", 400);
  }

  // Build update data with only provided fields using object spread
  const updateData: any = {
    updated_at: toISOStringSafe(new Date()),
  };

  if (props.body.first_name !== undefined) {
    updateData.first_name = props.body.first_name;
  }

  if (props.body.last_name !== undefined) {
    updateData.last_name = props.body.last_name;
  }

  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }

  // Update member profile
  const updated = await MyGlobal.prisma.todo_app_members.update({
    where: { id: props.memberId },
    data: updateData,
  });

  return {
    id: updated.id,
    email: updated.email,
    first_name: updated.first_name ?? undefined,
    last_name: updated.last_name ?? undefined,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
