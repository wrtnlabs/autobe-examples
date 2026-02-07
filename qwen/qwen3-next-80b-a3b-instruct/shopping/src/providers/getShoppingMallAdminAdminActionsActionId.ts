import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAction";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminAdminActionsActionId(props: {
  admin: AdminPayload;
  actionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminAction> {
  const action = await MyGlobal.prisma.shopping_mall_admin_actions.findUnique({
    where: { id: props.actionId },
    select: {
      id: true,
      admin_id: true,
      action_type: true,
      affected_entity_type: true,
      affected_entity_id: true,
      reason: true,
      created_at: true,
    },
  });
  if (!action) {
    throw new HttpException("Admin action not found", 404);
  }
  return {
    id: action.id,
    admin_id: action.admin_id,
    action_type: action.action_type,
    affected_entity_type: action.affected_entity_type,
    affected_entity_id: action.affected_entity_id,
    reason: action.reason,
    created_at: toISOStringSafe(action.created_at),
  };
}
