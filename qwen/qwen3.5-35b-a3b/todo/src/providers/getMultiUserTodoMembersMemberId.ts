import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoMemberTransformer } from "../transformers/MultiUserTodoMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMembersMemberId(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoMember> {
  const record =
    await MyGlobal.prisma.multi_user_todo_members.findUniqueOrThrow({
      ...MultiUserTodoMemberTransformer.select(),
      where: { id: props.memberId },
    });
  if (record.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  return await MultiUserTodoMemberTransformer.transform(record);
}
