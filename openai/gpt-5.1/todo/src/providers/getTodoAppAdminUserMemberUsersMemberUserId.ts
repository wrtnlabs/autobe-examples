import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getTodoAppAdminUserMemberUsersMemberUserId(props: {
  adminUser: AdminuserPayload;
  memberUserId: string;
}): Promise<ITodoAppMemberUser> {
  // Fetch the member user record from Prisma using the provided identifier.
  // Authorization for adminUser is handled by surrounding decorators/middleware.

  let memberUserRecord: {
    id: string;
    email: string;
    password_hash: string;
    display_name: string | null;
    status: string;
    created_at: unknown;
    updated_at: unknown;
  } | null = null;

  try {
    memberUserRecord = await MyGlobal.prisma.todo_app_memberusers.findUnique({
      where: {
        id: props.memberUserId,
      },
    });
  } catch (error) {
    // If Prisma throws due to an invalid identifier format or other query issue,
    // surface this as a 400 Bad Request consistent with the spec's guidance
    // about distinguishing malformed identifiers.
    throw new HttpException("Invalid memberUserId format", 400);
  }

  if (memberUserRecord === null) {
    throw new HttpException("Member user not found", 404);
  }

  const displayNameValue: string | null | undefined =
    memberUserRecord.display_name === null
      ? null
      : memberUserRecord.display_name;

  const createdAtValue = toISOStringSafe(
    memberUserRecord.created_at as string & tags.Format<"date-time">,
  );
  const updatedAtValue = toISOStringSafe(
    memberUserRecord.updated_at as string & tags.Format<"date-time">,
  );

  const result: ITodoAppMemberUser = {
    id: memberUserRecord.id,
    email: memberUserRecord.email,
    display_name: displayNameValue,
    status: memberUserRecord.status,
    created_at: createdAtValue,
    updated_at: updatedAtValue,
  };

  return result;
}
