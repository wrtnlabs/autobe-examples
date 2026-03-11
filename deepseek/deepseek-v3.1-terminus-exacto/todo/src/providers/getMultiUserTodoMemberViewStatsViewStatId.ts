import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoTodoViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoViewStat";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoViewStatTransformer } from "../transformers/MultiUserTodoTodoViewStatTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberViewStatsViewStatId(props: {
  member: MemberPayload;
  viewStatId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoTodoViewStat> {
  const viewStat =
    await MyGlobal.prisma.multi_user_todo_todo_view_stats.findUniqueOrThrow({
      where: {
        id: props.viewStatId,
        multi_user_todo_member_id: props.member.id,
      },
      ...MultiUserTodoTodoViewStatTransformer.select(),
    });
  return await MultiUserTodoTodoViewStatTransformer.transform(viewStat);
}
