import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getAuthAdminSessions(props: {
  admin: AdminPayload;
}): Promise<IShoppingMallAdmin.ISessionList> {
  const { admin } = props;

  const sessions = await MyGlobal.prisma.shopping_mall_sessions.findMany({
    where: {
      user_type: "admin",
      admin_id: admin.id,
      is_revoked: false,
    },
    orderBy: {
      last_activity_at: "desc",
    },
  });

  const sessionList: IShoppingMallAdminSession[] = sessions.map((session) => ({
    id: session.id as string & tags.Format<"uuid">,
    device_type: session.device_type === null ? undefined : session.device_type,
    device_name: session.device_name === null ? undefined : session.device_name,
    browser_name:
      session.browser_name === null ? undefined : session.browser_name,
    operating_system:
      session.operating_system === null ? undefined : session.operating_system,
    approximate_location:
      session.approximate_location === null
        ? undefined
        : session.approximate_location,
    ip_address: session.ip_address,
    created_at: toISOStringSafe(session.created_at),
    last_activity_at: toISOStringSafe(session.last_activity_at),
  }));

  return {
    sessions: sessionList,
    total_count: Number(sessions.length),
  };
}
