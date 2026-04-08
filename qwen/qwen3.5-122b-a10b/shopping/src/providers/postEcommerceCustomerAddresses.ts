import { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceAddressCollector } from "../collectors/EcommerceAddressCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceAddressTransformer } from "../transformers/EcommerceAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceCustomerAddresses(props: {
  customer: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "customer";
  };
  body: IEcommerceAddress.ICreate;
}): Promise<IEcommerceAddress> {
  // If marking as default, unset previous default address first
  if (props.body.is_default) {
    await MyGlobal.prisma.ecommerce_addresses.updateMany({
      where: {
        ecommerce_customer_id: props.customer.id,
        is_default: true,
        deleted_at: null,
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    });
  }
  // Create new address using collector
  const record = await MyGlobal.prisma.ecommerce_addresses.create({
    data: await EcommerceAddressCollector.collect({
      body: props.body,
      customer: props.customer,
    }),
    ...EcommerceAddressTransformer.select(),
  });
  return await EcommerceAddressTransformer.transform(record);
}
