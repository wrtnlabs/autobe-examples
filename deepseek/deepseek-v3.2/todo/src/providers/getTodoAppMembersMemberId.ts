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

export async function getTodoAppMembersMemberId(props: {
  memberId: string;
}): Promise<ITodoAppMember> {
  const member = await MyGlobal.prisma.todo_app_members.findUnique({
    where: { id: props.memberId },
    ...TodoAppMemberTransformer.select(),
  });
  if (!member) {
    throw new HttpException("Member not found", 404);
  }
  if (member.deleted_at !== null) {
    throw new HttpException("Member not found", 404);
  }
  return await TodoAppMemberTransformer.transform(member);
}
