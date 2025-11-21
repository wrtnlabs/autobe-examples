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

export async function postShoppingMallAdminActorsAdmins(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.ICreate;
}): Promise<IShoppingMallAdmin> {
  const admin = await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      first_name: props.body.first_name,
      last_name: props.body.last_name,
      status: "pending_verification",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  return {
    id: admin.id,
    email: admin.email,
    first_name: admin.first_name,
    last_name: admin.last_name,
    status: admin.status satisfies string as
      | "active"
      | "pending_verification"
      | "suspended"
      | "deleted",
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at
      ? toISOStringSafe(admin.deleted_at)
      : "1970-01-01T00:00:00Z",
  };
}
