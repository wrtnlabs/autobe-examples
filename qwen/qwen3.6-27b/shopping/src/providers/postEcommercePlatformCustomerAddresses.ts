import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformShippingAddressCollector } from "../collectors/EcommercePlatformShippingAddressCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformShippingAddressTransformer } from "../transformers/EcommercePlatformShippingAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IEcommercePlatformShippingAddress.ICreate;
}): Promise<IEcommercePlatformShippingAddress> {
  const customerProfile =
    await MyGlobal.prisma.ecommerce_platform_customer_profiles.findFirstOrThrow(
      {
        where: {
          ecommerce_platform_customer_id: props.customer.id,
        },
        select: {
          id: true,
        },
      },
    );
  if (props.body.isDefault) {
    await MyGlobal.prisma.ecommerce_platform_shipping_addresses.updateMany({
      where: {
        ecommerce_platform_customer_profile_id: customerProfile.id,
        deleted_at: null,
      },
      data: {
        is_default: false,
      },
    });
  }
  const record =
    await MyGlobal.prisma.ecommerce_platform_shipping_addresses.create({
      data: await EcommercePlatformShippingAddressCollector.collect({
        body: props.body,
        ecommercePlatformCustomerProfiles: customerProfile,
      }),
      ...EcommercePlatformShippingAddressTransformer.select(),
    });
  return await EcommercePlatformShippingAddressTransformer.transform(record);
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
// import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
// import { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
// import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformCustomerAddresses(props: {
//   customer: CustomerPayload;
//   body: IEcommercePlatformShippingAddress.ICreate;
// }): Promise<IEcommercePlatformShippingAddress> {
//   const record = await MyGlobal.prisma.ecommerce_platform_shipping_addresses.create({
//     data: await EcommercePlatformShippingAddressCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommercePlatformShippingAddressTransformer.select(),
//   });
//   return await EcommercePlatformShippingAddressTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------