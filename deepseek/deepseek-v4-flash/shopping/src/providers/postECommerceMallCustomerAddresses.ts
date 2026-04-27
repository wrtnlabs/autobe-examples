import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ECommerceMallCustomerAddressCollector } from "../collectors/ECommerceMallCustomerAddressCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallCustomerAddressTransformer } from "../transformers/ECommerceMallCustomerAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IECommerceMallCustomerAddress.ICreate;
}): Promise<IECommerceMallCustomerAddress> {
  if (props.body.is_default === true) {
    await MyGlobal.prisma.e_commerce_mall_customer_addresses.updateMany({
      where: {
        e_commerce_mall_customer_id: props.customer.id,
        is_default: true,
        deleted_at: null,
      },
      data: { is_default: false, updated_at: new Date() },
    });
  }
  const record =
    await MyGlobal.prisma.e_commerce_mall_customer_addresses.create({
      data: await ECommerceMallCustomerAddressCollector.collect({
        body: props.body,
        eCommerceMallCustomers: { id: props.customer.id },
        eCommerceMallCustomerSessions: { id: props.customer.session_id },
      }),
      ...ECommerceMallCustomerAddressTransformer.select(),
    });
  return await ECommerceMallCustomerAddressTransformer.transform(record);
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
// import { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallCustomerAddresses(props: {
//   customer: CustomerPayload;
//   body: IECommerceMallCustomerAddress.ICreate;
// }): Promise<IECommerceMallCustomerAddress> {
//   const record = await MyGlobal.prisma.e_commerce_mall_customer_addresses.create({
//     data: await ECommerceMallCustomerAddressCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ECommerceMallCustomerAddressTransformer.select(),
//   });
//   return await ECommerceMallCustomerAddressTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------