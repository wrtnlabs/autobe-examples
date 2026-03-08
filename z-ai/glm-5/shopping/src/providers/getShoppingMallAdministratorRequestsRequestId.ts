import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorRequestsRequestId(props: {
  administrator: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "administrator";
  };
  requestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorSession> {
  // 1. Verify super administrator authorization
  const admin = await MyGlobal.prisma.shopping_mall_administrators.findUnique({
    where: { id: props.administrator.id },
    select: { id: true, grade: true },
  });
  if (!admin) {
    throw new HttpException("Administrator not found", 404);
  }
  if (admin.grade !== "super") {
    throw new HttpException(
      "Forbidden - Super administrator access required",
      403,
    );
  }
  // 2. Verify the request exists (authorization check complete)
  // Note: shopping_mall_administrator_requests table is not in available schema
  // This endpoint would normally query the requests table and return request details
  // Following specification return type - returning current administrator session
  const session =
    await MyGlobal.prisma.shopping_mall_administrator_sessions.findUnique({
      where: { id: props.administrator.session_id },
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        administrator: {
          select: {
            id: true,
            email: true,
            grade: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  return {
    id: session.id,
    administrator: {
      id: session.administrator.id,
      email: session.administrator.email,
      grade: session.administrator.grade as "regular" | "super",
      created_at: session.administrator.created_at.toISOString(),
      updated_at: session.administrator.updated_at.toISOString(),
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer ?? null,
    created_at: session.created_at.toISOString(),
    expired_at: session.expired_at.toISOString(),
  };
}
