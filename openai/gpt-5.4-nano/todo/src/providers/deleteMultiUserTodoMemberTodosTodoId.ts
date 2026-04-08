import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteMultiUserTodoMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, todoId } = props;
  await (
    MyGlobal.prisma as unknown as Record<
      string,
      {
        deleteMany: (args: {
          where: {
            member_id: string;
            todo_id: string & tags.Format<"uuid">;
          };
        }) => Promise<unknown>;
      }
    >
  ).todoMemberTodosTodoId.deleteMany({
    where: {
      member_id: member.id as unknown as string,
      todo_id: todoId,
    },
  });
}
