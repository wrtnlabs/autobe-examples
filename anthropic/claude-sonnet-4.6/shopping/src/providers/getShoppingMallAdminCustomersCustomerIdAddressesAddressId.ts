import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCustomerAddressTransformer } from "../transformers/ShoppingMallCustomerAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminCustomersCustomerIdAddressesAddressId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerAddress> {
  const record =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findFirstOrThrow({
      where: {
        id: props.addressId,
        shopping_mall_customer_id: props.customerId,
        deleted_at: null,
      },
      ...ShoppingMallCustomerAddressTransformer.select(),
    });
  return ShoppingMallCustomerAddressTransformer.transform(record);
}
