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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformShippingAddressTransformer } from "../transformers/EcommercePlatformShippingAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommercePlatformCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformShippingAddress> {
  const record =
    await MyGlobal.prisma.ecommerce_platform_shipping_addresses.findFirstOrThrow(
      {
        ...EcommercePlatformShippingAddressTransformer.select(),
        select: {
          ...EcommercePlatformShippingAddressTransformer.select().select,
          customerProfile: {
            select: {
              id: true,
              created_at: true,
              display_name: true,
              phone_number: true,
              customer: {
                select: {
                  email: true,
                  id: true,
                  created_at: true,
                  updated_at: true,
                  is_banned: true,
                  deleted_at: true,
                },
              },
            },
          },
        },
        where: {
          id: props.addressId,
          deleted_at: null,
          customerProfile: {
            is: {
              ecommerce_platform_customer_id: props.customer.id,
            },
          },
        },
      },
    );
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
// export async function getEcommercePlatformCustomerAddressesAddressId(props: {
//   customer: CustomerPayload;
//   addressId: string & tags.Format<"uuid">;
// }): Promise<IEcommercePlatformShippingAddress> {
//   const record = await MyGlobal.prisma.ecommerce_platform_shipping_addresses.findFirstOrThrow({
//     ...EcommercePlatformShippingAddressTransformer.select(),
//     where: { ... },
//   });
//   return await EcommercePlatformShippingAddressTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------