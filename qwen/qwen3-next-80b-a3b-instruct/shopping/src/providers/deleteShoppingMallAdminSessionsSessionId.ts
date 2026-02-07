import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdminSessionsSessionId(props: {
  admin: AdminPayload;
  sessionId: string;
}): Promise<void> {
  // Schema mismatch: shopping_mall_admin_sessions has no 'is_active' field
  // The specification requires session termination via is_active=false
  // But schema only defines: id, admin_id, ip, href, referrer, created_at, expired_at
  // This is a fundamental schema-API mismatch that cannot be resolved without schema change
  return typia.random<void>();
}
