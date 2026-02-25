import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardUserTransformer } from "../transformers/DiscussionBoardUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserAdministratorsAdministratorIdDemote(props: {
  user: UserPayload;
  administratorId: string;
  body: IDiscussionBoardAdministrator.IDemote;
}): Promise<IDiscussionBoardUser> {
  // 1. Verify actor is SUPER_ADMINISTRATOR
  const actor = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
    where: { id: props.user.id },
    select: { id: true, permission_level: true },
  });
  if (actor.permission_level !== "SUPER_ADMINISTRATOR") {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Find target administrator
  const target = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow(
    {
      where: { id: props.administratorId },
      select: { id: true, permission_level: true, deleted_at: true },
    },
  );
  // 3. Validate target is not deleted
  if (target.deleted_at !== null) {
    throw new HttpException("Target administrator not found", 404);
  }
  // 4. Validate target is a super administrator
  if (target.permission_level !== "SUPER_ADMINISTRATOR") {
    throw new HttpException("Target is not a super administrator", 400);
  }
  // 5. Prevent self-demotion
  if (target.id === props.user.id) {
    throw new HttpException("Cannot demote yourself", 400);
  }
  // 6. Ensure at least one non-banned super admin remains after demotion
  const superAdminCount = await MyGlobal.prisma.discussion_board_users.count({
    where: {
      permission_level: "SUPER_ADMINISTRATOR",
      deleted_at: null,
      is_banned: false,
    },
  });
  if (superAdminCount <= 1) {
    throw new HttpException(
      "At least one super administrator must remain",
      400,
    );
  }
  // 7. Create citizen record for audit trail sequential ID
  const now = new Date();
  const actionId = v4();
  await MyGlobal.prisma.discussion_board_admin_hierarchy_action_citizens.create(
    {
      data: {
        id: actionId,
        created_at: now,
      },
    },
  );
  // 8. Create audit record for demotion
  await MyGlobal.prisma.discussion_board_admin_hierarchy_actions.create({
    data: {
      id: actionId,
      actor_id: props.user.id,
      target_id: props.administratorId,
      action_type: "DEMOTION",
      reason: props.body.reason ?? null,
      created_at: now,
    },
  });
  // 9. Update target's permission level to ADMINISTRATOR
  await MyGlobal.prisma.discussion_board_users.update({
    where: { id: props.administratorId },
    data: {
      permission_level: "ADMINISTRATOR",
      updated_at: now,
    },
  });
  // 10. Return the updated user with transformed response
  const updatedUser =
    await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
      where: { id: props.administratorId },
      ...DiscussionBoardUserTransformer.select(),
    });
  return await DiscussionBoardUserTransformer.transform(updatedUser);
}
