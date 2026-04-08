import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShippingAddressTransformer } from "../transformers/EcommerceMallShippingAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCustomersMeAddressesAddressIdSetDefault(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShippingAddress> {
  // Validate address exists, is not soft-deleted, and belongs to this customer
  const address =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findFirst({
      select: {
        id: true,
        ecommerce_mall_customer_id: true,
      },
      where: {
        id: props.addressId,
        deleted_at: null,
      },
    });
  // Address not found or soft-deleted → 404
  if (address === null) {
    throw new HttpException("Address not found or has been deleted", 404);
  }
  // Address belongs to different customer → 403
  if (address.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "You do not have permission to modify this address",
      403,
    );
  }
  // Transaction: clear current default, set new default
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_shipping_addresses.updateMany({
      where: {
        ecommerce_mall_customer_id: props.customer.id,
        is_default: true,
        deleted_at: null,
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.ecommerce_mall_shipping_addresses.update({
      where: { id: props.addressId },
      data: {
        is_default: true,
        updated_at: new Date(),
      },
    }),
  ]);
  // Fetch and return updated address
  const updated =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findFirstOrThrow({
      where: {
        id: props.addressId,
        deleted_at: null,
      },
      ...EcommerceMallShippingAddressTransformer.select(),
    });
  return await EcommerceMallShippingAddressTransformer.transform(updated);
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
// export async function postEcommerceMallCustomerCustomersMeAddressesAddressIdSetDefault(props: {
//   customer: CustomerPayload;
//   addressId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallShippingAddress> {
//   const record = await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findFirstOrThrow({
//     ...EcommerceMallShippingAddressTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallShippingAddressTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------