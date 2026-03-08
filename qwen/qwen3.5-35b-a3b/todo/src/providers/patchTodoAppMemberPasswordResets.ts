import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppMemberPasswordResetCollector } from "../collectors/TodoAppMemberPasswordResetCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberPasswordResetAtCreatedTransformer } from "../transformers/TodoAppMemberPasswordResetAtCreatedTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberPasswordResets(props: {
  member: MemberPayload;
  body: ITodoAppMemberPasswordReset.ICreate;
}): Promise<ITodoAppMemberPasswordReset.ICreated> {
  const created = await MyGlobal.prisma.todo_app_member_password_resets.create({
    data: await TodoAppMemberPasswordResetCollector.collect({
      body: props.body,
    }),
    ...TodoAppMemberPasswordResetAtCreatedTransformer.select(),
  });
  return await TodoAppMemberPasswordResetAtCreatedTransformer.transform(
    created,
  );
}
