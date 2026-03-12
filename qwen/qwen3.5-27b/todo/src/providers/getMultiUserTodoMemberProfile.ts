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
import { MultiUserTodoMemberAtSummaryTransformer } from "../transformers/MultiUserTodoMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberProfile(props: {
  member: MemberPayload;
}): Promise<IMultiUserTodoMember.ISummary> {
  const member =
    await MyGlobal.prisma.multi_user_todo_members.findUniqueOrThrow({
      where: {
        id: props.member.id,
        deleted_at: null,
      },
      ...MultiUserTodoMemberAtSummaryTransformer.select(),
    });
  return await MultiUserTodoMemberAtSummaryTransformer.transform(member);
}
