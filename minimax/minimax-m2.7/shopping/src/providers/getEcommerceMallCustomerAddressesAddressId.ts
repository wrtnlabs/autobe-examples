import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShippingAddressTransformer } from "../transformers/EcommerceMallShippingAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShippingAddress> {
  const address =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findUniqueOrThrow({
      where: {
        id: props.addressId,
        ecommerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      ...EcommerceMallShippingAddressTransformer.select(),
    });
  return await EcommerceMallShippingAddressTransformer.transform(address);
}
