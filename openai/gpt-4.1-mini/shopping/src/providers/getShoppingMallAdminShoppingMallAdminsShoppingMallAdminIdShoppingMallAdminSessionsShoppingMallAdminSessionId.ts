import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminShoppingMallAdminsShoppingMallAdminIdShoppingMallAdminSessionsShoppingMallAdminSessionId(props: {
  admin: AdminPayload;
  shoppingMallAdminId: string & tags.Format<"uuid">;
  shoppingMallAdminSessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminSession> {
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findUnique(
    {
      where: {
        id: props.shoppingMallAdminSessionId,
        shopping_mall_admin_id: props.shoppingMallAdminId,
      },
    },
  );

  if (!session) {
    throw new HttpException("Shopping mall admin session not found.", 404);
  }

  return {
    id: session.id,
    shoppingMallAdminId: session.shopping_mall_admin_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
