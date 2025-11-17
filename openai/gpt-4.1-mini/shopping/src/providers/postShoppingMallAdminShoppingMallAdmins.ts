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

export async function postShoppingMallAdminShoppingMallAdmins(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.ICreate;
}): Promise<IShoppingMallAdmin> {
  try {
    const id: string & tags.Format<"uuid"> = v4();
    const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
    const created = await MyGlobal.prisma.shopping_mall_admins.create({
      data: {
        id,
        email: props.body.email,
        password_hash: await PasswordUtil.hash(props.body.password),
        created_at: now,
        updated_at: now,
      },
    });

    return {
      id: created.id,
      email: created.email,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  } catch {
    throw new HttpException(
      "Failed to create shopping mall admin account",
      500,
    );
  }
}
