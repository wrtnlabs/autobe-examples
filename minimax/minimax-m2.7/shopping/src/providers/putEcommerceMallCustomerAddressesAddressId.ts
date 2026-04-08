import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
  // Verify ownership - address must exist and belong to authenticated customer
  await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findUniqueOrThrow({
    where: {
      id: props.addressId,
      ecommerce_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  // If setting this address as default, unset other defaults for this customer
  if (props.body.isDefault === true) {
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.updateMany({
      where: {
        ecommerce_mall_customer_id: props.customer.id,
        deleted_at: null,
        id: { not: props.addressId },
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    });
  }
  // Build update data with only provided optional fields
  const updateData: Prisma.ecommerce_mall_shipping_addressesUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.recipientName !== undefined) {
    updateData.recipient_name = props.body.recipientName;
  }
  if (props.body.phone !== undefined) {
    updateData.phone = props.body.phone;
  }
  if (props.body.streetAddress !== undefined) {
    updateData.street_address = props.body.streetAddress;
  }
  if (props.body.city !== undefined) {
    updateData.city = props.body.city;
  }
  if (props.body.state !== undefined) {
    updateData.state = props.body.state;
  }
  if (props.body.postalCode !== undefined) {
    updateData.postal_code = props.body.postalCode;
  }
  if (props.body.country !== undefined) {
    updateData.country = props.body.country;
  }
  if (props.body.isDefault !== undefined) {
    updateData.is_default = props.body.isDefault;
  }
  await MyGlobal.prisma.ecommerce_mall_shipping_addresses.update({
    where: { id: props.addressId },
    data: updateData,
  });
  // Return updated address using transformer
  const updated =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
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
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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