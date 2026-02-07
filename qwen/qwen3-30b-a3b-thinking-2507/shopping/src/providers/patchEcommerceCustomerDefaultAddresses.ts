import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceDefaultAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDefaultAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceDefaultAddressTransformer } from "../transformers/EcommerceDefaultAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerDefaultAddresses(props: {
  customer: CustomerPayload;
  body: IEcommerceDefaultAddress.IRequest;
}): Promise<IEcommerceDefaultAddress> {
  const defaultAddress =
    await MyGlobal.prisma.ecommerce_default_addresses.findUnique({
      where: {
        ecommerce_customer_id: props.customer.id,
        deleted_at: null,
      },
      ...EcommerceDefaultAddressTransformer.select(),
    });
  if (!defaultAddress) {
    throw new HttpException("Default address not found", 404);
  }
  return await EcommerceDefaultAddressTransformer.transform(defaultAddress);
}
