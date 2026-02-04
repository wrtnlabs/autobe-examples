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
import { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallAdminPasswordResetTransformer } from "../transformers/ShoppingMallAdminPasswordResetTransformer";

export async function postShoppingMallCustomerAdminsRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallAdminPasswordReset.ICreate;
}): Promise<IShoppingMallAdminPasswordReset> {
  const created =
    await MyGlobal.prisma.shopping_mall_admin_password_resets.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        token: v4(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        created_at: toISOStringSafe(new Date()),
        used_at: null,
        admin: {
          connect: { id: props.customer.id },
        },
      },
      include: {
        admin: true,
      },
    });
  return ShoppingMallAdminPasswordResetTransformer.transform(created);
}
