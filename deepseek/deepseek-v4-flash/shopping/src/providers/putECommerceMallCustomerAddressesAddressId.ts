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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallCustomerAddressTransformer } from "../transformers/ECommerceMallCustomerAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putECommerceMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
  body: IECommerceMallCustomerAddress.IUpdate;
}): Promise<IECommerceMallCustomerAddress> {
  const existing =
    await MyGlobal.prisma.e_commerce_mall_customer_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      select: {
        id: true,
        e_commerce_mall_customer_id: true,
        deleted_at: true,
      },
    });
  if (existing.e_commerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Address not found", 404);
  }
  if (existing.deleted_at !== null) {
    throw new HttpException("Address not found", 404);
  }
  if (props.body.is_default === true) {
    await MyGlobal.prisma.e_commerce_mall_customer_addresses.updateMany({
      where: {
        e_commerce_mall_customer_id: props.customer.id,
        is_default: true,
        id: { not: props.addressId },
      },
      data: {
        is_default: false,
        updated_at: new Date().toISOString(),
      },
    });
  }
  await MyGlobal.prisma.e_commerce_mall_customer_addresses.update({
    where: { id: props.addressId },
    data: {
      ...(props.body.recipient_name !== undefined && {
        recipient_name: props.body.recipient_name,
      }),
      ...(props.body.phone_number !== undefined && {
        phone_number: props.body.phone_number,
      }),
      ...(props.body.street_address !== undefined && {
        street_address: props.body.street_address,
      }),
      ...(props.body.city !== undefined && { city: props.body.city }),
      ...(props.body.state_province !== undefined && {
        state_province: props.body.state_province,
      }),
      ...(props.body.postal_code !== undefined && {
        postal_code: props.body.postal_code,
      }),
      ...(props.body.country !== undefined && { country: props.body.country }),
      ...(props.body.is_default !== undefined && {
        is_default: props.body.is_default,
      }),
      updated_at: new Date().toISOString(),
    },
  });
  const updated =
    await MyGlobal.prisma.e_commerce_mall_customer_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      ...ECommerceMallCustomerAddressTransformer.select(),
    });
  return await ECommerceMallCustomerAddressTransformer.transform(updated);
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
// export async function putECommerceMallCustomerAddressesAddressId(props: {
//   customer: CustomerPayload;
//   addressId: string & tags.Format<"uuid">;
//   body: IECommerceMallCustomerAddress.IUpdate;
// }): Promise<IECommerceMallCustomerAddress> {
//   await MyGlobal.prisma.e_commerce_mall_customer_addresses.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.e_commerce_mall_customer_addresses.findUniqueOrThrow({
//     where: { ... },
//     ...ECommerceMallCustomerAddressTransformer.select(),
//   });
//   return await ECommerceMallCustomerAddressTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------