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

export async function patchEcommerceMallCustomerCustomersMeAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
  body: IEcommerceMallShippingAddress.IUpdate;
}): Promise<IEcommerceMallShippingAddress> {
  // Step 1: Verify address exists and belongs to authenticated customer
  await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findFirstOrThrow({
    where: {
      id: props.addressId,
      ecommerce_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  // Step 2: If setting this address as default, clear other default addresses
  if (props.body.is_default === true) {
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.updateMany({
      where: {
        ecommerce_mall_customer_id: props.customer.id,
        is_default: true,
        id: { not: props.addressId },
      },
      data: {
        is_default: false,
      },
    });
  }
  // Step 3: Build partial update data with proper typing
  const data: Parameters<
    typeof MyGlobal.prisma.ecommerce_mall_shipping_addresses.update
  >[0]["data"] = {};
  if (props.body.recipient_name !== undefined) {
    data.recipient_name = props.body.recipient_name;
  }
  if (props.body.phone !== undefined) {
    data.phone = props.body.phone;
  }
  if (props.body.street_address !== undefined) {
    data.street_address = props.body.street_address;
  }
  if (props.body.city !== undefined) {
    data.city = props.body.city;
  }
  if (props.body.state !== undefined) {
    data.state = props.body.state;
  }
  if (props.body.postal_code !== undefined) {
    data.postal_code = props.body.postal_code;
  }
  if (props.body.country !== undefined) {
    data.country = props.body.country;
  }
  if (props.body.is_default !== undefined) {
    data.is_default = props.body.is_default;
  }
  // Always update timestamp
  data.updated_at = new Date();
  // Step 4: Apply the update (no select - get raw record)
  const updated =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.update({
      where: { id: props.addressId },
      data,
    });
  // Step 5: Build result with required relations for transformer
  const result: Parameters<
    typeof EcommerceMallShippingAddressTransformer.transform
  >[0] = {
    id: updated.id,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    deleted_at: updated.deleted_at,
    recipient_name: updated.recipient_name,
    phone: updated.phone,
    street_address: updated.street_address,
    city: updated.city,
    state: updated.state,
    postal_code: updated.postal_code,
    country: updated.country,
    is_default: updated.is_default,
    customer: {
      id: props.customer.id,
    },
    orders: [],
  };
  // Step 6: Return using transformer
  return EcommerceMallShippingAddressTransformer.transform(result);
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
// export async function patchEcommerceMallCustomerCustomersMeAddressesAddressId(props: {
//   customer: CustomerPayload;
//   addressId: string & tags.Format<"uuid">;
//   body: IEcommerceMallShippingAddress.IUpdate;
// }): Promise<IEcommerceMallShippingAddress> {
//   const record = await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findFirstOrThrow({
//     ...EcommerceMallShippingAddressTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallShippingAddressTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------