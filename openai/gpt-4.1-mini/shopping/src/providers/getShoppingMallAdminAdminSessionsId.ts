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

export async function getShoppingMallAdminAdminSessionsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminSession> {
  const { id } = props;

  const session =
    await MyGlobal.prisma.shopping_mall_admin_sessions.findFirstOrThrow({
      where: {
        id,
      },
      select: {
        id: true,
        shopping_mall_admin_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });

  return {
    id: session.id,
    shopping_mall_admin_id: session.shopping_mall_admin_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
