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
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardAdminHierarchyActionTransformer } from "../transformers/DiscussionBoardAdminHierarchyActionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserAdminHierarchyActionsAdminHierarchyActionId(props: {
  user: UserPayload;
  adminHierarchyActionId: string;
}): Promise<IDiscussionBoardAdminHierarchyAction> {
  // Verify the user has administrator permission
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
    select: { permission_level: true },
  });
  if (
    !user ||
    (user.permission_level !== "ADMINISTRATOR" &&
      user.permission_level !== "SUPER_ADMINISTRATOR")
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve the hierarchy action record with actor and target relations
  const action =
    await MyGlobal.prisma.discussion_board_admin_hierarchy_actions.findUniqueOrThrow(
      {
        where: { id: props.adminHierarchyActionId },
        ...DiscussionBoardAdminHierarchyActionTransformer.select(),
      },
    );
  return await DiscussionBoardAdminHierarchyActionTransformer.transform(action);
}
