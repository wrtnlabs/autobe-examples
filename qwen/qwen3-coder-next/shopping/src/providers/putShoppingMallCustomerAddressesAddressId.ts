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

export async function putShoppingMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerAddress.IUpdate;
}): Promise<IShoppingMallCustomerAddress> {
  // Find existing address and verify ownership
  const address =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findFirst({
      where: {
        id: props.addressId,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  if (address === null) {
    throw new HttpException("Address not found or access denied", 404);
  }
  // Update address with provided fields
  const updated = await MyGlobal.prisma.shopping_mall_customer_addresses.update(
    {
      where: { id: props.addressId },
      data: {
        recipient_name: props.body.recipient_name ?? address.recipient_name,
        phone_number: props.body.phone_number ?? address.phone_number,
        street_address: props.body.street_address ?? address.street_address,
        city: props.body.city ?? address.city,
        state: props.body.state ?? address.state,
        postal_code: props.body.postal_code ?? address.postal_code,
        country: props.body.country ?? address.country,
        updated_at: new Date(),
      },
      ...ShoppingMallCustomerAddressTransformer.select(),
    },
  );
  return await ShoppingMallCustomerAddressTransformer.transform(updated);
}
