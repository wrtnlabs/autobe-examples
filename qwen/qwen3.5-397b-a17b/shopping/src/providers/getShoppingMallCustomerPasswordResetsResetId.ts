import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerPasswordResetTransformer } from "../transformers/ShoppingMallCustomerPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerPasswordResetsResetId(props: {
  customer: CustomerPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerPasswordReset> {
  const reset =
    await MyGlobal.prisma.shopping_mall_customer_password_resets.findUniqueOrThrow(
      {
        where: { id: props.resetId },
        ...ShoppingMallCustomerPasswordResetTransformer.select(),
      },
    );
  return await ShoppingMallCustomerPasswordResetTransformer.transform(reset);
}
