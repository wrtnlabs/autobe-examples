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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformShippingAddressTransformer } from "../transformers/MallPlatformShippingAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformCustomerShippingAddressesShippingAddressId(props: {
  customer: CustomerPayload;
  shippingAddressId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformShippingAddress> {
  const record =
    await MyGlobal.prisma.mall_platform_shipping_addresses.findFirstOrThrow({
      where: {
        id: props.shippingAddressId,
        customer_id: props.customer.id,
      },
      ...MallPlatformShippingAddressTransformer.select(),
    });
  return await MallPlatformShippingAddressTransformer.transform(record);
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
// import { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getMallPlatformCustomerShippingAddressesShippingAddressId(props: {
//   customer: CustomerPayload;
//   shippingAddressId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformShippingAddress> {
//   const record = await MyGlobal.prisma.mall_platform_shipping_addresses.findFirstOrThrow({
//     ...MallPlatformShippingAddressTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformShippingAddressTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------