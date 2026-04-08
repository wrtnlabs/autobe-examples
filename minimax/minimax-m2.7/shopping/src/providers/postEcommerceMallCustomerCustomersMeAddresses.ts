import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallShippingAddressCollector } from "../collectors/EcommerceMallShippingAddressCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShippingAddressTransformer } from "../transformers/EcommerceMallShippingAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCustomersMeAddresses(props: {
  customer: CustomerPayload;
  body: IEcommerceMallShippingAddress.ICreate;
}): Promise<IEcommerceMallShippingAddress> {
  if (props.body.is_default) {
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.updateMany({
      where: {
        ecommerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    });
  }
  const record = await MyGlobal.prisma.ecommerce_mall_shipping_addresses.create(
    {
      data: await EcommerceMallShippingAddressCollector.collect({
        body: props.body,
        ecommerceMallCustomers: { id: props.customer.id },
        ecommerceMallCustomerSessions: { id: props.customer.session_id },
      }),
      ...EcommerceMallShippingAddressTransformer.select(),
    },
  );
  return await EcommerceMallShippingAddressTransformer.transform(record);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerCustomersMeAddresses(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallShippingAddress.ICreate;
// }): Promise<IEcommerceMallShippingAddress> {
//   const record = await MyGlobal.prisma.ecommerce_mall_shipping_addresses.create({
//     data: await EcommerceMallShippingAddressCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallShippingAddressTransformer.select(),
//   });
//   return await EcommerceMallShippingAddressTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------