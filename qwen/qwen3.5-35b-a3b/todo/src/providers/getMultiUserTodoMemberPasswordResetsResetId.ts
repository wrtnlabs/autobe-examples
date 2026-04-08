import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoMemberPasswordResetAtAdminViewTransformer } from "../transformers/MultiUserTodoMemberPasswordResetAtAdminViewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberPasswordResetsResetId(props: {
  resetId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoMemberPasswordReset.IAdminView> {
  const record =
    await MyGlobal.prisma.multi_user_todo_member_password_resets.findFirstOrThrow(
      {
        ...MultiUserTodoMemberPasswordResetAtAdminViewTransformer.select(),
        where: { id: props.resetId },
      },
    );
  return await MultiUserTodoMemberPasswordResetAtAdminViewTransformer.transform(
    record,
  );
}
