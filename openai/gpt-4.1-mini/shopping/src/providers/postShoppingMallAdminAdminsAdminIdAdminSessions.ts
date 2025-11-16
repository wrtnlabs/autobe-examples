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

export async function postShoppingMallAdminAdminsAdminIdAdminSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminSession.ICreate;
}): Promise<IShoppingMallAdminSession> {
  if (props.admin.id !== props.adminId) {
    throw new HttpException("Forbidden", 403);
  }

  const created = await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: v4() satisfies string & tags.Format<"uuid"> as string &
        tags.Format<"uuid">,
      shopping_mall_admin_id: props.adminId,
      token: props.body.token,
      ip: props.body.ip ?? null,
      user_agent: props.body.user_agent ?? null,
      expired_at: props.body.expires_at ?? null,
      created_at: new Date(),
      is_active: true,
    },
  });

  return {
    id: created.id,
    ip: created.ip === null ? undefined : created.ip,
    user_agent: props.body.user_agent ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    expires_at:
      created.expired_at === null ? null : toISOStringSafe(created.expired_at),
    is_active: created.is_active,
  };
}
