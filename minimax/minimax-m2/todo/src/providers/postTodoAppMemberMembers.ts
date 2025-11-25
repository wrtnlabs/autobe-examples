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

export async function postTodoAppMemberMembers(props: {
  member: MemberPayload;
  body: ITodoAppMember.ICreate;
}): Promise<ITodoAppMember> {
  // Validate email uniqueness
  const existingMember = await MyGlobal.prisma.todo_app_members.findUnique({
    where: { email: props.body.email },
  });

  if (existingMember) {
    throw new HttpException("Email already exists", 409);
  }

  // Create new member with generated UUID and timestamps
  const memberId = v4() as string & tags.Format<"uuid">;
  const now = new Date();
  const created_at = toISOStringSafe(now);
  const updated_at = toISOStringSafe(now);

  const created = await MyGlobal.prisma.todo_app_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      first_name: props.body.first_name,
      last_name: props.body.last_name,
      status: "active", // Automatically set status to active
      created_at: now,
      updated_at: now,
    },
  });

  // Return formatted member data with proper field handling
  return {
    id: created.id,
    email: created.email,
    first_name: created.first_name ?? undefined,
    last_name: created.last_name ?? undefined,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
