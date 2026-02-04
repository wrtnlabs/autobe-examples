import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminAuthAdminsLogout(props: {
  admin: AdminPayload;
}): Promise<void> {
  const tokenId = props.admin.session_id;
  // Invalidate refresh token in database by setting expired_at
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_admin_sessions.update({
    where: {
      id: tokenId,
    },
    data: {
      expired_at: now,
    },
  });
  // Log logout event - provide complete CreateInput with all required properties
  await MyGlobal.prisma.shopping_mall_admin_sessions.upsert({
    where: {
      id: tokenId,
    },
    update: {
      expired_at: now,
      ip: "",
      href: "",
      referrer: "",
    },
    create: {
      id: tokenId,
      expired_at: now,
      ip: "",
      href: "",
      referrer: "",
      created_at: now,
      admin: { connect: { id: props.admin.id } },
    },
  });
  return;
}
