import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAdminsAdminIdAdminSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IPageIShoppingMallAdminSession.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admin_sessions.findMany({
      where: {
        shopping_mall_admin_id: props.adminId,
        // remove deleted_at because it does not exist on Prisma type
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_admin_sessions.count({
      where: {
        shopping_mall_admin_id: props.adminId,
        // remove deleted_at because it does not exist on Prisma type
      },
    }),
  ]);

  return {
    data: sessions.map((session) => ({
      id: session.id,
      admin_id: session.shopping_mall_admin_id,
      ip_address: session.ip ?? undefined,
      created_at: toISOStringSafe(session.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
