import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getTodoMemberMembersMemberId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<ITodoMember> {
  // Authorization: member can only access their own profile
  if (props.member.id !== props.memberId) {
    throw new HttpException(
      "Unauthorized: You can only access your own profile",
      403,
    );
  }

  // Retrieve member data from database
  const member = await MyGlobal.prisma.todo_member.findUniqueOrThrow({
    where: {
      id: props.memberId,
    },
    select: {
      id: true,
      email: true,
      role: true,
      last_login_at: true,
      login_attempts: true,
      locked_until: true,
      created_at: true,
      updated_at: true,
    },
  });

  // Convert to ITodoMember interface with proper date string formatting
  // Prisma returns Date objects, but API expects ISO string format
  return {
    id: member.id as string & tags.Format<"uuid">,
    email: member.email as string & tags.Format<"email">,
    role: member.role,
    last_login_at: member.last_login_at
      ? toISOStringSafe(member.last_login_at)
      : undefined,
    login_attempts:
      member.login_attempts !== null
        ? (member.login_attempts as number & tags.Type<"int32">)
        : undefined,
    locked_until: member.locked_until
      ? toISOStringSafe(member.locked_until)
      : undefined,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
  } satisfies ITodoMember;
}
