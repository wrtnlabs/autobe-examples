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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";

export async function postShoppingMallSuperAdminAuthSuperAdminsLogout(props: {
  superAdmin: SuperadminPayload;
}): Promise<void> {
  // Extract session_id from authenticated super admin payload
  const { session_id } = props.superAdmin;
  // Invalidate the session by deleting the session record
  await MyGlobal.prisma.shopping_mall_super_admin_sessions.delete({
    where: { id: session_id },
  });
  // Return 204 No Content as specified in specification
  return;
}
