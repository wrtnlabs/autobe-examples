import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformShippingAddressCollector } from "../collectors/MallPlatformShippingAddressCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformShippingAddressTransformer } from "../transformers/MallPlatformShippingAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformCustomerShippingAddresses(props: {
  customer: CustomerPayload;
  body: IMallPlatformShippingAddress.ICreate;
}): Promise<IMallPlatformShippingAddress> {
  const created = await MyGlobal.prisma.mall_platform_shipping_addresses.create(
    {
      data: await MallPlatformShippingAddressCollector.collect({
        body: props.body,
        customer: props.customer,
      }),
      ...MallPlatformShippingAddressTransformer.select(),
    },
  );
  return await MallPlatformShippingAddressTransformer.transform(created);
}
