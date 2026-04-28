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

export async function putEcommercePlatformCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
  body: IEcommercePlatformShippingAddress.IUpdate;
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
  const existingAddress =
    await MyGlobal.prisma.ecommerce_platform_shipping_addresses.findUniqueOrThrow(
      {
        where: {
          id: props.addressId,
        },
        select: {
          id: true,
          ecommerce_platform_customer_profile_id: true,
          deleted_at: true,
        },
      },
    );
  if (existingAddress.deleted_at !== null) {
    throw new HttpException("Shipping address not found", 404);
  }
  if (
    existingAddress.ecommerce_platform_customer_profile_id !==
    customerProfile.id
  ) {
    throw new HttpException("Shipping address not found", 404);
  }
  if (props.body.isDefault === true) {
    await MyGlobal.prisma.ecommerce_platform_shipping_addresses.updateMany({
      where: {
        ecommerce_platform_customer_profile_id: customerProfile.id,
        id: {
          not: props.addressId,
        },
        is_default: true,
        deleted_at: null,
      },
      data: {
        is_default: false,
      },
    });
  }
  await MyGlobal.prisma.ecommerce_platform_shipping_addresses.update({
    where: {
      id: props.addressId,
    },
    data: {
      ...(props.body.recipientName !== undefined && {
        recipient_name: props.body.recipientName,
      }),
      ...(props.body.phoneNumber !== undefined && {
        phone_number: props.body.phoneNumber,
      }),
      ...(props.body.streetAddress !== undefined && {
        street_address: props.body.streetAddress,
      }),
      ...(props.body.city !== undefined && { city: props.body.city }),
      ...(props.body.state !== undefined && { state: props.body.state }),
      ...(props.body.postalCode !== undefined && {
        postal_code: props.body.postalCode,
      }),
      ...(props.body.country !== undefined && { country: props.body.country }),
      ...(props.body.isDefault !== undefined && {
        is_default: props.body.isDefault,
      }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.ecommerce_platform_shipping_addresses.findUniqueOrThrow(
      {
        where: {
          id: props.addressId,
        },
        ...EcommercePlatformShippingAddressTransformer.select(),
      },
    );
  return await EcommercePlatformShippingAddressTransformer.transform(updated);
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
// export async function putEcommercePlatformCustomerAddressesAddressId(props: {
//   customer: CustomerPayload;
//   addressId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformShippingAddress.IUpdate;
// }): Promise<IEcommercePlatformShippingAddress> {
//   await MyGlobal.prisma.ecommerce_platform_shipping_addresses.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_platform_shipping_addresses.findUniqueOrThrow({
//     where: { ... },
//     ...EcommercePlatformShippingAddressTransformer.select(),
//   });
//   return await EcommercePlatformShippingAddressTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------