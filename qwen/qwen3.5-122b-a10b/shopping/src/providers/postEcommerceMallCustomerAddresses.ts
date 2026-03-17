import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallAddressCollector } from "../collectors/EcommerceMallAddressCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallAddressTransformer } from "../transformers/EcommerceMallAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IEcommerceMallAddress.ICreate;
}): Promise<IEcommerceMallAddress> {
  // Validate default address constraint
  if (props.body.is_default === true) {
    const existingDefault =
      await MyGlobal.prisma.ecommerce_mall_addresses.findFirst({
        where: {
          ecommerce_mall_customer_id: props.customer.id,
          is_default: true,
          deleted_at: null,
        },
      });
    if (existingDefault !== null) {
      throw new HttpException("Customer already has a default address", 409);
    }
  }
  // Create address using collector
  const created = await MyGlobal.prisma.ecommerce_mall_addresses.create({
    data: await EcommerceMallAddressCollector.collect({
      body: props.body,
      ecommerceMallCustomer: { id: props.customer.id } as any,
    }),
    ...EcommerceMallAddressTransformer.select(),
  });
  return await EcommerceMallAddressTransformer.transform(created);
}
