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

export async function putMallPlatformCustomerShippingAddressesShippingAddressId(props: {
  customer: CustomerPayload;
  shippingAddressId: string & tags.Format<"uuid">;
  body: IMallPlatformShippingAddress.IUpdate;
}): Promise<IMallPlatformShippingAddress> {
  const current =
    await MyGlobal.prisma.mall_platform_shipping_addresses.findUniqueOrThrow({
      where: { id: props.shippingAddressId },
      select: {
        id: true,
        customer_id: true,
        deleted_at: true,
      },
    });
  if (current.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (current.deleted_at !== null) {
    throw new HttpException("Conflict", 409);
  }
  await MyGlobal.prisma.mall_platform_shipping_addresses.update({
    where: { id: props.shippingAddressId },
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
      ...(props.body.stateProvince !== undefined && {
        state_province: props.body.stateProvince,
      }),
      ...(props.body.postalCode !== undefined && {
        postal_code: props.body.postalCode,
      }),
      ...(props.body.country !== undefined && { country: props.body.country }),
      updated_at: new Date().toISOString(),
    },
  });
  const updated =
    await MyGlobal.prisma.mall_platform_shipping_addresses.findUniqueOrThrow({
      where: { id: props.shippingAddressId },
      ...MallPlatformShippingAddressTransformer.select(),
    });
  return await MallPlatformShippingAddressTransformer.transform(updated);
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
// export async function putMallPlatformCustomerShippingAddressesShippingAddressId(props: {
//   customer: CustomerPayload;
//   shippingAddressId: string & tags.Format<"uuid">;
//   body: IMallPlatformShippingAddress.IUpdate;
// }): Promise<IMallPlatformShippingAddress> {
//   await MyGlobal.prisma.mall_platform_shipping_addresses.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.mall_platform_shipping_addresses.findUniqueOrThrow({
//     where: { ... },
//     ...MallPlatformShippingAddressTransformer.select(),
//   });
//   return await MallPlatformShippingAddressTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------