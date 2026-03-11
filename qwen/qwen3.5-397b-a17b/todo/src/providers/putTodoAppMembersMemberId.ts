import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppMemberTransformer } from "../transformers/TodoAppMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppMembersMemberId(props: {
  memberId: string & tags.Format<"uuid">;
  body: ITodoAppMember.IUpdate;
}): Promise<ITodoAppMember> {
  await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: { id: props.memberId },
  });
  const passwordChanged = props.body.password !== undefined;
  await MyGlobal.prisma.todo_app_members.update({
    where: { id: props.memberId },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.password !== undefined && {
        password_hash: await PasswordUtil.hash(props.body.password),
      }),
      updated_at: new Date(),
    },
  });
  if (passwordChanged) {
    await MyGlobal.prisma.todo_app_member_sessions.deleteMany({
      where: { todo_app_member_id: props.memberId },
    });
  }
  const updated = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: { id: props.memberId },
    ...TodoAppMemberTransformer.select(),
  });
  return await TodoAppMemberTransformer.transform(updated);
}
