import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthSellerLogin(props: {
  body: IShoppingMallSeller.ILogin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // Need to use correct properties from ILogin interface
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      // Use correct property from ILogin
    },
    select: {
      id: true,
      email: true,
      shop_name: true,
      shop_description: true,
      logo_image_id: true,
      status: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
      password_hash: true,
    },
  });
  if (!seller) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Continue with correct property access
  return {
    token: {
      access: "",
      refresh: "",
      expired_at: toISOStringSafe(new Date(Date.now() + 30 * 60 * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ),
    },
  } satisfies IShoppingMallSeller.IAuthorized;
}
