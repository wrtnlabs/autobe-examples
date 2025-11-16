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

export async function putShoppingMallAdminAdminsAdminIdAdminSessionsAdminSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  adminSessionId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminSession.IUpdate;
}): Promise<IShoppingMallAdminSession> {
  const existing =
    await MyGlobal.prisma.shopping_mall_admin_sessions.findUnique({
      where: {
        id: props.adminSessionId,
      },
      select: {
        id: true,
        ip: true,
        created_at: true,
        expired_at: true,
      },
    });
  if (!existing) {
    throw new HttpException("Admin session not found", 404);
  }

  const data: any = {};
  if (props.body.session_token !== undefined)
    data.session_token = props.body.session_token;
  if (props.body.login_ip !== undefined) data.login_ip = props.body.login_ip;
  if (props.body.login_user_agent !== undefined)
    data.login_user_agent = props.body.login_user_agent;
  if (props.body.expires_at !== undefined)
    data.expired_at = props.body.expires_at;

  const updated = await MyGlobal.prisma.shopping_mall_admin_sessions.update({
    where: {
      id: props.adminSessionId,
    },
    data,
    select: {
      id: true,
      ip: true,
      created_at: true,
      expired_at: true,
    },
  });

  return {
    id: updated.id,
    ip: updated.ip,
    user_agent: "",
    is_active: false,
    created_at: toISOStringSafe(updated.created_at),
    expires_at:
      updated.expired_at !== null && updated.expired_at !== undefined
        ? toISOStringSafe(updated.expired_at)
        : null,
  };
}
