import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSuperAdminEmailVerificationCollector } from "../collectors/ShoppingMallSuperAdminEmailVerificationCollector";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSuperAdminEmailVerifications(props: {
  body: IShoppingMallSuperAdminEmailVerification.ICreate;
}): Promise<IShoppingMallSuperAdminEmailVerification> {
  const created =
    await MyGlobal.prisma.shopping_mall_super_admin_email_verifications.create({
      data: await ShoppingMallSuperAdminEmailVerificationCollector.collect({
        body: props.body,
        shoppingMallSuperAdmins: { id: "super-admin-id" },
        shoppingMallSuperAdminSessions: { id: "session-id" },
      }),
      select: {
        id: true,
        shopping_mall_super_admin_id: true,
        token: true,
        expires_at: true,
        verified_at: true,
        created_at: true,
        updated_at: true,
      },
    });
  return {
    id: created.id,
    shopping_mall_super_admin_id: created.shopping_mall_super_admin_id,
    token: created.token,
    expires_at: created.expires_at,
    verified_at: created.verified_at,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}
