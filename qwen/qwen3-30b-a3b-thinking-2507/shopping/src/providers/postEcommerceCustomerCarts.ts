import { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceCartCollector } from "../collectors/EcommerceCartCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCartTransformer } from "../transformers/EcommerceCartTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceCustomerCarts(props: {
  customer: CustomerPayload;
  body: IEcommerceCart.ICreate;
}): Promise<IEcommerceCart> {
  const created = await MyGlobal.prisma.ecommerce_carts.create({
    data: await EcommerceCartCollector.collect({
      body: props.body,
      ecommerceCustomers: { id: props.customer.id },
    }),
    ...EcommerceCartTransformer.select(),
  });
  return await EcommerceCartTransformer.transform(created);
}
