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

export async function getTodoAppMemberMembersMemberIdProfile(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<ITodoAppMember.IInvert> {
  // Verify member can only access their own profile
  if (props.member.id !== props.memberId) {
    throw new HttpException(
      "Access denied: can only view your own profile",
      403,
    );
  }

  // Fetch member profile
  const member = await MyGlobal.prisma.todo_app_members.findUnique({
    where: { id: props.memberId },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  // Check if member is soft deleted
  if (member.deleted_at) {
    throw new HttpException("Member account has been deactivated", 403);
  }

  // Return member profile matching ITodoAppMember.IInvert interface exactly
  return {
    id: member.id,
    email: member.email,
    first_name: member.first_name || undefined,
    last_name: member.last_name || undefined,
    status: member.status,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: (member.deleted_at
      ? toISOStringSafe(member.deleted_at)
      : undefined) satisfies
      | (string & tags.Format<"date-time">)
      | undefined as string & tags.Format<"date-time">,
  };
}
