import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberPasswordResetAtValidationTransformer } from "../transformers/TodoAppMemberPasswordResetAtValidationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<ITodoAppMemberPasswordReset.IValidation> {
  const record =
    await MyGlobal.prisma.todo_app_member_password_resets.findFirstOrThrow({
      where: {
        id: props.resetId,
        deleted_at: null,
      },
      ...TodoAppMemberPasswordResetAtValidationTransformer.select(),
    });
  if (new Date() >= record.expires_at) {
    throw new HttpException("Token has expired", 410);
  }
  if (record.used_at !== null) {
    throw new HttpException("Token has already been used", 410);
  }
  return await TodoAppMemberPasswordResetAtValidationTransformer.transform(
    record,
  );
}
