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

export async function getTodoAppMemberMembersMemberId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<ITodoAppMember> {
  const { memberId } = props;

  // Query the member from database
  const foundMember = await MyGlobal.prisma.todo_app_members.findUnique({
    where: { id: memberId },
  });

  if (!foundMember) {
    throw new HttpException("Member not found", 404);
  }

  // Check if member is soft deleted
  if (foundMember.deleted_at) {
    throw new HttpException("Member not found", 404);
  }

  // Return member profile with proper formatting
  return {
    id: foundMember.id,
    email: foundMember.email,
    first_name: foundMember.first_name ?? undefined,
    last_name: foundMember.last_name ?? undefined,
    status: foundMember.status,
    created_at: toISOStringSafe(foundMember.created_at),
    updated_at: toISOStringSafe(foundMember.updated_at),
    deleted_at: foundMember.deleted_at
      ? toISOStringSafe(foundMember.deleted_at)
      : undefined,
  };
}
