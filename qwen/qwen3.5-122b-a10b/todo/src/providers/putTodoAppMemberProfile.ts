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
  // Verify member exists and is not soft-deleted
  await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
  });
  // Validate display_name if provided
  if (props.body.display_name !== undefined) {
    const displayName = props.body.display_name.trim();
    if (displayName.length === 0) {
      throw new HttpException("Display name cannot be empty", 400);
    }
    if (displayName.length > 100) {
      throw new HttpException(
        "Display name must be 100 characters or less",
        400,
      );
    }
  }
  // Update the member profile
  await MyGlobal.prisma.todo_app_members.update({
    where: { id: props.member.id },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name.trim(),
      }),
      updated_at: new Date(),
    },
  });
  // Fetch and transform the updated record
  const updated = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: { id: props.member.id },
    ...TodoAppMemberTransformer.select(),
  });
  return await TodoAppMemberTransformer.transform(updated);
}
