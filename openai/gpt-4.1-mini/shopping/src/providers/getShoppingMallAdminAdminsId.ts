import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminAdminsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdmin> {
  const { admin, id } = props;

  const record = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id },
  });

  const status = typia.assert<"active" | "suspended" | "disabled">(
    record.status,
  );

  return {
    id: record.id,
    email: record.email,
    password_hash: record.password_hash,
    full_name: record.full_name ?? null,
    phone_number: record.phone_number ?? null,
    status: status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    shopping_mall_report_count: null,
  };
}
