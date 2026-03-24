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
import { TodoAppMemberPasswordResetTransformer } from "../transformers/TodoAppMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<ITodoAppMemberPasswordReset> {
  try {
    const reset =
      await MyGlobal.prisma.todo_app_member_password_resets.findFirstOrThrow({
        where: {
          id: props.resetId,
          deleted_at: null,
          todo_app_member_id: props.member.id,
        },
        ...TodoAppMemberPasswordResetTransformer.select(),
      });
    const nowMs: number = Date.now();
    const expiresMs: number = reset.expires_at.getTime();
    if (reset.used_at !== null || expiresMs <= nowMs) {
      throw new HttpException("Not found", 404);
    }
    return await TodoAppMemberPasswordResetTransformer.transform(reset);
  } catch (_err: unknown) {
    throw new HttpException("Not found", 404);
  }
}
