import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminSellers(props: {
  admin: AdminPayload;
  body: IShoppingMallSeller.ICreate;
}): Promise<IShoppingMallSeller> {
  const existingSeller = await MyGlobal.prisma.shopping_mall_sellers.findUnique(
    {
      where: { email: props.body.email },
    },
  );

  if (existingSeller !== null) {
    throw new HttpException(
      `A seller with email '${props.body.email}' already exists.`,
      400,
    );
  }

  const passwordHash = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      name: props.body.name,
      business_status: "pending" satisfies "approved" | "pending" | "rejected",
      status: "inactive" satisfies "active" | "inactive" | "suspended",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    email: created.email,
    name: created.name,
    status: typia.assert<"active" | "inactive" | "suspended">(created.status),
    business_status: typia.assert<"approved" | "pending" | "rejected">(
      created.business_status,
    ),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
