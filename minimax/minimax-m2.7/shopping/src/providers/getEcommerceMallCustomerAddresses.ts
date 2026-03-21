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

export async function getEcommerceMallCustomerAddresses(props: {
  customer: CustomerPayload;
}): Promise<IEcommerceMallShippingAddress[]> {
  const addresses =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findMany({
      where: {
        ecommerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      ...EcommerceMallShippingAddressTransformer.select(),
    });
  return ArrayUtil.asyncMap(
    addresses,
    EcommerceMallShippingAddressTransformer.transform,
  );
}
