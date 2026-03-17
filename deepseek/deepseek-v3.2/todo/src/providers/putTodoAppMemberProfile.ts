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
  // Verify the member exists and is active
  const existing = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
  });
  // Prepare update data with proper typing
  const updateData: {
    display_name?: string;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  // Update display_name if provided and non-empty
  if (
    props.body.display_name !== undefined &&
    props.body.display_name.trim().length > 0
  ) {
    updateData.display_name = props.body.display_name;
  }
  // If only updated_at is set (no actual field changes), return current member
  if (Object.keys(updateData).length === 1 && "updated_at" in updateData) {
    const member = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
      where: { id: props.member.id },
      ...TodoAppMemberTransformer.select(),
    });
    return await TodoAppMemberTransformer.transform(member);
  }
  // Perform update
  await MyGlobal.prisma.todo_app_members.update({
    where: { id: props.member.id },
    data: updateData,
  });
  // Fetch updated member with transformer
  const updated = await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: { id: props.member.id },
    ...TodoAppMemberTransformer.select(),
  });
  return await TodoAppMemberTransformer.transform(updated);
}
