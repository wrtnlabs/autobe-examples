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

export async function getShoppingMallAdminAdminsAdminIdAdminSessionsAdminSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  adminSessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminSession> {
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findFirst({
    where: {
      id: props.adminSessionId,
      shopping_mall_admin_id: props.adminId,
    },
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
      shopping_mall_admin_id: true,
    },
  });

  if (!session) {
    throw new HttpException(
      `Admin session not found: id=${props.adminSessionId}`,
      404,
    );
  }

  return {
    id: session.id,
    ip: session.ip,
    user_agent: session.href,
    is_active: true, // No such property in schema, assume active since session was found
    created_at: toISOStringSafe(session.created_at),
    expires_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
