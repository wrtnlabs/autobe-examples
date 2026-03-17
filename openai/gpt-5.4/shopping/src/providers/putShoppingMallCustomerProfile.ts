import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerProfileTransformer } from "../transformers/ShoppingMallCustomerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerProfile(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerProfile.IUpdate;
}): Promise<IShoppingMallCustomerProfile> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const customer = await tx.shopping_mall_customers.findFirst({
      where: {
        id: props.customer.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (customer === null) {
      throw new HttpException(
        "Customer account is deleted or unavailable",
        403,
      );
    }
    const profile = await tx.shopping_mall_customer_profiles.findFirstOrThrow({
      where: {
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    await tx.shopping_mall_customer_profiles.update({
      where: {
        id: profile.id,
      },
      data: {
        ...(props.body.displayName !== undefined
          ? {
              display_name: props.body.displayName,
            }
          : {}),
        ...(props.body.phoneNumber !== undefined
          ? {
              phone_number: props.body.phoneNumber,
            }
          : {}),
        updated_at: new Date(),
      },
    });
    const updated = await tx.shopping_mall_customer_profiles.findFirstOrThrow({
      where: {
        id: profile.id,
        deleted_at: null,
      },
      ...ShoppingMallCustomerProfileTransformer.select(),
    });
    return await ShoppingMallCustomerProfileTransformer.transform(updated);
  });
}
