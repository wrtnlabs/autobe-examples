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

export async function putEcommerceMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
  body: IEcommerceMallShippingAddress.IUpdate;
}): Promise<IEcommerceMallShippingAddress> {
  // Ownership check: verify address belongs to customer and is not soft-deleted
  await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findUniqueOrThrow({
    where: {
      id: props.addressId,
      ecommerce_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  // Update with transaction for atomic is_default handling
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    // If setting this address as default, clear other default addresses first
    if (props.body.is_default === true) {
      await tx.ecommerce_mall_shipping_addresses.updateMany({
        where: {
          ecommerce_mall_customer_id: props.customer.id,
          deleted_at: null,
          id: { not: props.addressId },
          is_default: true,
        },
        data: { is_default: false },
      });
    }
    // Build update data with partial fields from body
    const data: Prisma.ecommerce_mall_shipping_addressesUpdateInput = {
      updated_at: new Date(),
      ...(props.body.recipient_name !== undefined && {
        recipient_name: props.body.recipient_name,
      }),
      ...(props.body.phone !== undefined && {
        phone: props.body.phone,
      }),
      ...(props.body.street_address !== undefined && {
        street_address: props.body.street_address,
      }),
      ...(props.body.city !== undefined && {
        city: props.body.city,
      }),
      ...(props.body.state !== undefined && {
        state: props.body.state,
      }),
      ...(props.body.postal_code !== undefined && {
        postal_code: props.body.postal_code,
      }),
      ...(props.body.country !== undefined && {
        country: props.body.country,
      }),
      ...(props.body.is_default !== undefined && {
        is_default: props.body.is_default,
      }),
    };
    await tx.ecommerce_mall_shipping_addresses.update({
      where: { id: props.addressId },
      data,
    });
    // Fetch updated record for response
    return tx.ecommerce_mall_shipping_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      ...EcommerceMallShippingAddressTransformer.select(),
    });
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
// export async function putEcommerceMallCustomerAddressesAddressId(props: {
//   customer: CustomerPayload;
//   addressId: string & tags.Format<"uuid">;
//   body: IEcommerceMallShippingAddress.IUpdate;
// }): Promise<IEcommerceMallShippingAddress> {
//   await MyGlobal.prisma.ecommerce_mall_shipping_addresses.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallShippingAddressTransformer.select(),
//   });
//   return await EcommerceMallShippingAddressTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------