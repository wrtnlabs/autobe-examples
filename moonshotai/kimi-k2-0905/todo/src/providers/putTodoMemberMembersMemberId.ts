import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";
import { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putTodoMemberMembersMemberId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: ITodoMember.IUpdate;
}): Promise<ITodoMember> {
  // Verify the target member exists and isn't locked
  const targetMember = await MyGlobal.prisma.todo_member.findUniqueOrThrow({
    where: { id: props.memberId },
  });

  // Authorization: Members can only update their own profile
  if (targetMember.id !== props.member.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own profile",
      403,
    );
  }

  // Check if member is locked (additional security)
  if (targetMember.locked_until !== null) {
    throw new HttpException("Account is locked", 403);
  }

  // Build update data with proper null handling
  const updateData = {
    ...(props.body.email !== undefined &&
      props.body.email !== null && {
        email: props.body.email,
      }),
    ...(props.body.role !== undefined &&
      props.body.role !== null && {
        role: props.body.role,
      }),
    updated_at: toISOStringSafe(new Date()),
  } satisfies Prisma.todo_memberUpdateInput;

  // Execute the update
  const updated = await MyGlobal.prisma.todo_member.update({
    where: { id: props.memberId },
    data: updateData,
  });

  // Return the updated member profile - match ITodoMember interface exactly
  return {
    id: updated.id as string & tags.Format<"uuid">,
    email: updated.email as string & tags.Format<"email">,
    role: updated.role,
    last_login_at: updated.last_login_at
      ? toISOStringSafe(updated.last_login_at)
      : undefined,
    login_attempts: updated.login_attempts,
    locked_until: updated.locked_until
      ? toISOStringSafe(updated.locked_until)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
