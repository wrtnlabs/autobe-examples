import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallCustomerPasswordResetTransformer } from "../transformers/ShoppingMallCustomerPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorPasswordResetsPasswordResetId(props: {
  administrator: AdministratorPayload;
  passwordResetId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerPasswordReset> {
  const record =
    await MyGlobal.prisma.shopping_mall_customer_password_resets.findUniqueOrThrow(
      {
        where: { id: props.passwordResetId },
        ...ShoppingMallCustomerPasswordResetTransformer.select(),
      },
    );
  return ShoppingMallCustomerPasswordResetTransformer.transform(record);
}
