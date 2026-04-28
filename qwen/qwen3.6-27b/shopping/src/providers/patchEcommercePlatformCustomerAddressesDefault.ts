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

export async function patchEcommercePlatformCustomerAddressesDefault(props: {
  customer: CustomerPayload;
  body: IEcommercePlatformShippingAddress.ISetDefault;
}): Promise<IEcommercePlatformShippingAddress> {
  const profile =
    await MyGlobal.prisma.ecommerce_platform_customer_profiles.findUniqueOrThrow(
      {
        where: {
          ecommerce_platform_customer_id: props.customer.id,
        },
      },
    );
  await MyGlobal.prisma.$transaction(async (tx) => {
    const target = await tx.ecommerce_platform_shipping_addresses.findFirst({
      where: {
        id: props.body.addressId,
        ecommerce_platform_customer_profile_id: profile.id,
        deleted_at: null,
      },
      select: {
        id: true,
        is_default: true,
      },
    });
    if (target === null) {
      throw new HttpException("Shipping address not found", 404);
    }
    if (target.is_default) {
      return;
    }
    await tx.ecommerce_platform_shipping_addresses.updateMany({
      where: {
        ecommerce_platform_customer_profile_id: profile.id,
        is_default: true,
        deleted_at: null,
      },
      data: {
        is_default: false,
      },
    });
    await tx.ecommerce_platform_shipping_addresses.update({
      where: {
        id: props.body.addressId,
      },
      data: {
        is_default: true,
      },
    });
  });
  const address =
    await MyGlobal.prisma.ecommerce_platform_shipping_addresses.findFirstOrThrow(
      {
        ...EcommercePlatformShippingAddressTransformer.select(),
        where: {
          id: props.body.addressId,
          ecommerce_platform_customer_profile_id: profile.id,
          deleted_at: null,
        },
      },
    );
  return await EcommercePlatformShippingAddressTransformer.transform(address);
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
// export async function patchEcommercePlatformCustomerAddressesDefault(props: {
//   customer: CustomerPayload;
//   body: IEcommercePlatformShippingAddress.ISetDefault;
// }): Promise<IEcommercePlatformShippingAddress> {
//   const record = await MyGlobal.prisma.ecommerce_platform_shipping_addresses.findFirstOrThrow({
//     ...EcommercePlatformShippingAddressTransformer.select(),
//     where: { ... },
//   });
//   return await EcommercePlatformShippingAddressTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------