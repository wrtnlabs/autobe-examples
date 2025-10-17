import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getEconomicBoardAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardAdmin> {
  const admin = await MyGlobal.prisma.economic_board_admin.findUniqueOrThrow({
    where: {
      id: props.adminId,
    },
  });

  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    last_login: toISOStringSafe(admin.last_login),
    is_active: admin.is_active,
    auth_jwt_id: admin.auth_jwt_id,
    password_hash: admin.password_hash,
  } satisfies IEconomicBoardAdmin;
}
