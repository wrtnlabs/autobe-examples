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
  const id: string & tags.Format<"uuid"> = v4();
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id,
      email: props.body.email,
      name: props.body.name,
      password_hash: hashedPassword,
      status: "active",
      business_status: "operating",
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  return {
    id: created.id,
    email: created.email,
    name: created.name,
    role: props.body.role,
    is_active: true,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
