import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberTransformer } from "../transformers/TodoAppMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppMemberProfile(props: {
  member: MemberPayload;
  body: ITodoAppMember.IUpdate;
}): Promise<ITodoAppMember> {
  if (props.body.display_name !== undefined) {
    if (props.body.display_name.trim().length === 0) {
      throw new HttpException(
        "Display name cannot be empty or whitespace-only",
        400,
      );
    }
  }
  const updateData: Prisma.todo_app_membersUpdateInput = {
    ...(props.body.display_name !== undefined && {
      display_name: props.body.display_name,
    }),
    updated_at: new Date(),
  };
  await MyGlobal.prisma.todo_app_members.update({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    data: updateData,
  });
  const updated = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    ...TodoAppMemberTransformer.select(),
  });
  return await TodoAppMemberTransformer.transform(updated);
}
