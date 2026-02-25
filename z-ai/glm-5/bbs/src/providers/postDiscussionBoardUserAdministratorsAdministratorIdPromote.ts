import { IDiscussionBoardAdminHierarchyAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminHierarchyAction";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdminHierarchyActionCollector } from "../collectors/DiscussionBoardAdminHierarchyActionCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardUserTransformer } from "../transformers/DiscussionBoardUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserAdministratorsAdministratorIdPromote(props: {
  user: UserPayload;
  administratorId: string;
  body: IDiscussionBoardAdminHierarchyAction.ICreate;
}): Promise<IDiscussionBoardUser> {
  // 1. Verify caller is super administrator
  const caller = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow(
    {
      where: { id: props.user.id },
      select: { id: true, permission_level: true },
    },
  );
  if (caller.permission_level !== "SUPER_ADMINISTRATOR") {
    throw new HttpException(
      "Forbidden - Only super administrators can promote",
      403,
    );
  }
  // 2. Self-promotion prevention
  if (props.administratorId === props.user.id) {
    throw new HttpException("Cannot promote yourself", 400);
  }
  // 3. Query and validate target
  const target = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow(
    {
      where: { id: props.administratorId },
      select: { id: true, permission_level: true, is_banned: true },
    },
  );
  if (target.permission_level !== "ADMINISTRATOR") {
    throw new HttpException("Target must be a regular administrator", 400);
  }
  if (target.is_banned) {
    throw new HttpException("Cannot promote a banned user", 400);
  }
  // 4. Update permission level
  await MyGlobal.prisma.discussion_board_users.update({
    where: { id: props.administratorId },
    data: {
      permission_level: "SUPER_ADMINISTRATOR",
      updated_at: new Date(),
    },
  });
  // 5. Create audit record
  await MyGlobal.prisma.discussion_board_admin_hierarchy_actions.create({
    data: await DiscussionBoardAdminHierarchyActionCollector.collect({
      body: props.body,
      actor: { id: props.user.id },
      target: { id: props.administratorId },
      actionType: "PROMOTION",
    }),
  });
  // 6. Return updated user
  const updated =
    await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
      where: { id: props.administratorId },
      ...DiscussionBoardUserTransformer.select(),
    });
  return await DiscussionBoardUserTransformer.transform(updated);
}
