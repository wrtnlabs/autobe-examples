import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShippingAddressTransformer } from "../transformers/ShoppingMallShippingAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerShippingAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShippingAddress> {
  const address =
    await MyGlobal.prisma.shopping_mall_shipping_addresses.findFirstOrThrow({
      where: {
        id: props.addressId,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      ...ShoppingMallShippingAddressTransformer.select(),
    });
  return await ShoppingMallShippingAddressTransformer.transform(address);
}
