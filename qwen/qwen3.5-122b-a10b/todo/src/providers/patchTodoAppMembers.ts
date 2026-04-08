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

export async function patchTodoAppMembers(props: {
  body: ITodoAppMember.IUpdate;
}): Promise<ITodoAppMember> {
  // Validate display name length (1-100 characters)
  const displayName = props.body.displayName;
  if (displayName.length < 1 || displayName.length > 100) {
    throw new HttpException(
      "Display name must be between 1 and 100 characters",
      400,
    );
  }
  // In actual NestJS implementation, member ID would be extracted from JWT token
  // via auth guard and passed as a parameter (e.g., @Member() member: ITodoAppMember).
  // This placeholder represents where the authenticated member ID would be injected.
  const memberId: string & tags.Format<"uuid"> = "" as string &
    tags.Format<"uuid">;
  // Find member and verify they exist and are not deleted
  await MyGlobal.prisma.todo_app_members.findFirstOrThrow({
    where: {
      id: memberId,
      deleted_at: null,
    },
    select: {
      id: true,
      deleted_at: true,
    },
  } satisfies Prisma.todo_app_membersFindFirstArgs);
  // Update member profile
  const updated = await MyGlobal.prisma.todo_app_members.update({
    where: { id: memberId },
    data: {
      display_name: displayName,
      updated_at: new Date(),
    },
    ...TodoAppMemberTransformer.select(),
  });
  return await TodoAppMemberTransformer.transform(updated);
}
