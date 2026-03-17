import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberPasswordResetTransformer } from "../transformers/TodoAppMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string;
}): Promise<ITodoAppMemberPasswordReset> {
  // Query the password reset token with the transformer's select
  const reset =
    await MyGlobal.prisma.todo_app_member_password_resets.findUniqueOrThrow({
      where: { id: props.resetId },
      ...TodoAppMemberPasswordResetTransformer.select(),
    });
  // Check ownership: ensure the reset token belongs to the authenticated member
  // Access the member id through the member relation
  if (reset.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform and return the result
  return await TodoAppMemberPasswordResetTransformer.transform(reset);
}
