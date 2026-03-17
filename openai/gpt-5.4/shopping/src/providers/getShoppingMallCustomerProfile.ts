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

export async function getShoppingMallCustomerProfile(props: {
  customer: CustomerPayload;
}): Promise<IShoppingMallCustomerProfile> {
  const profile =
    await MyGlobal.prisma.shopping_mall_customer_profiles.findFirstOrThrow({
      where: {
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      ...ShoppingMallCustomerProfileTransformer.select(),
    });
  return await ShoppingMallCustomerProfileTransformer.transform(profile);
}
