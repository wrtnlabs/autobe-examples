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

export async function postShoppingMallAdminAdmins(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.ICreate;
}): Promise<IShoppingMallAdmin> {
  const { admin, body } = props;

  const existing = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (existing !== null) {
    throw new HttpException(
      `Conflict: email '${body.email}' is already in use.`,
      409,
    );
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: v4(),
      email: body.email,
      password_hash: body.password_hash,
      full_name: body.full_name ?? null,
      phone_number: body.phone_number ?? null,
      status: body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    full_name: created.full_name,
    phone_number: created.phone_number,
    status: typia.assert<"active" | "suspended" | "disabled">(created.status),
    created_at: toISOStringSafe(created.created_at) satisfies string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(created.updated_at) satisfies string &
      tags.Format<"date-time">,
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
    shopping_mall_report_count: null,
  };
}
