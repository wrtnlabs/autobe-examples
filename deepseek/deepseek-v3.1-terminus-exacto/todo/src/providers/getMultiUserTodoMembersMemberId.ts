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
  // Retrieve member by ID, excluding soft-deleted members
  const member =
    await MyGlobal.prisma.multi_user_todo_members.findUniqueOrThrow({
      where: {
        id: props.memberId,
        deleted_at: null, // Exclude soft-deleted members
      },
      ...MultiUserTodoMemberTransformer.select(),
    });
  // Transform database record to API response
  return await MultiUserTodoMemberTransformer.transform(member);
}
