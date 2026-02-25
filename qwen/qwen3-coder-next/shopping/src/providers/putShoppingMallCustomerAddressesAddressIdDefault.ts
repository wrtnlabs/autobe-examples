import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerAddressTransformer } from "../transformers/ShoppingMallCustomerAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerAddressesAddressIdDefault(props: {
  customer: CustomerPayload;
  addressId: string;
}): Promise<IShoppingMallCustomerAddress> {
  const address =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findFirst({
      where: {
        id: props.addressId as string & tags.Format<"uuid">,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  if (address === null) {
    throw new HttpException("Address not found", 404);
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_customer_addresses.updateMany({
      where: {
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.shopping_mall_customer_addresses.update({
      where: { id: props.addressId as string & tags.Format<"uuid"> },
      data: {
        is_default: true,
        updated_at: new Date(),
      },
    }),
  ]);
  const updated =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findUniqueOrThrow({
      where: { id: props.addressId as string & tags.Format<"uuid"> },
      ...ShoppingMallCustomerAddressTransformer.select(),
    });
  return await ShoppingMallCustomerAddressTransformer.transform(updated);
}
