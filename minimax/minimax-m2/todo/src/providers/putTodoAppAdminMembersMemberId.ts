import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putTodoAppAdminMembersMemberId(props: {
  admin: AdminPayload;
  memberId: string & tags.Format<"uuid">;
  body: ITodoAppMember.IUpdate;
}): Promise<ITodoAppMember> {
  // Verify member exists and is not deleted
  const existingMember = await MyGlobal.prisma.todo_app_members.findFirst({
    where: {
      id: props.memberId,
      deleted_at: null,
    },
  });

  if (!existingMember) {
    throw new HttpException("Member not found", 404);
  }

  // Validate status if provided
  if (props.body.status !== undefined) {
    const validStatuses = ["active", "suspended", "deactivated"];
    if (!validStatuses.includes(props.body.status)) {
      throw new HttpException("Invalid status value", 400);
    }
  }

  // Update the member
  const updatedMember = await MyGlobal.prisma.todo_app_members.update({
    where: { id: props.memberId },
    data: {
      ...(props.body.first_name !== undefined && {
        first_name: props.body.first_name,
      }),
      ...(props.body.last_name !== undefined && {
        last_name: props.body.last_name,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return formatted response
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
