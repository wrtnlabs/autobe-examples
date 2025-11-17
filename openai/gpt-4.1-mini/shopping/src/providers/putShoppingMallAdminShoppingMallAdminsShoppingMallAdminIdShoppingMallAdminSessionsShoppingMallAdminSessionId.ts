import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminShoppingMallAdminsShoppingMallAdminIdShoppingMallAdminSessionsShoppingMallAdminSessionId(props: {
  admin: AdminPayload;
  shoppingMallAdminId: string & tags.Format<"uuid">;
  shoppingMallAdminSessionId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminSession.IUpdate;
}): Promise<IShoppingMallAdminSession> {
  const existing =
    await MyGlobal.prisma.shopping_mall_admin_sessions.findUnique({
      where: { id: props.shoppingMallAdminSessionId },
    });
  if (!existing) {
    throw new HttpException("Admin session not found", 404);
  }

  if (existing.shopping_mall_admin_id !== props.shoppingMallAdminId) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.shopping_mall_admin_sessions.update({
    where: { id: props.shoppingMallAdminSessionId },
    data: {
      ip: props.body.ip ?? existing.ip,
      href: props.body.href ?? existing.href,
      referrer: props.body.referrer ?? existing.referrer,
      expired_at:
        props.body.expired_at === undefined
          ? existing.expired_at
          : props.body.expired_at,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    shoppingMallAdminId: updated.shopping_mall_admin_id as string &
      tags.Format<"uuid">,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at:
      updated.expired_at === null ? null : toISOStringSafe(updated.expired_at),
  };
}
