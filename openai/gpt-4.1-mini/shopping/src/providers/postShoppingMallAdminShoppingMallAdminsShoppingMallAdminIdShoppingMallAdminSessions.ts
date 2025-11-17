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

export async function postShoppingMallAdminShoppingMallAdminsShoppingMallAdminIdShoppingMallAdminSessions(props: {
  admin: AdminPayload;
  shoppingMallAdminId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminSession.ICreate;
}): Promise<IShoppingMallAdminSession> {
  const created = await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: props.shoppingMallAdminId,
      ip: props.body.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: null,
    },
  });

  return {
    id: created.id,
    shoppingMallAdminId: created.shopping_mall_admin_id,
    ip: created.ip,
    href: created.href,
    referrer: created.referrer,
    created_at: toISOStringSafe(created.created_at),
    expired_at:
      created.expired_at !== null ? toISOStringSafe(created.expired_at) : null,
  };
}
