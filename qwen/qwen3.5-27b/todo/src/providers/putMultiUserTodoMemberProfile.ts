import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoMemberTransformer } from "../transformers/MultiUserTodoMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMultiUserTodoMemberProfile(props: {
  member: MemberPayload;
  body: IMultiUserTodoMember.IUpdate;
}): Promise<IMultiUserTodoMember> {
  // Validate display_name if provided
  if (props.body.display_name !== undefined) {
    const trimmed = props.body.display_name.trim();
    if (trimmed.length === 0) {
      throw new HttpException(
        "Display name cannot be empty or whitespace-only",
        400,
      );
    }
  }
  // Update the member profile
  const updated = await MyGlobal.prisma.multi_user_todo_members.update({
    where: { id: props.member.id },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name.trim(),
      }),
      updated_at: new Date(),
    },
    ...MultiUserTodoMemberTransformer.select(),
  });
  return await MultiUserTodoMemberTransformer.transform(updated);
}
