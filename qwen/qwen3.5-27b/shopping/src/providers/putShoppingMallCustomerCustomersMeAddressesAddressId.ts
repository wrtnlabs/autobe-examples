import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerAddressTransformer } from "../transformers/ShoppingMallCustomerAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerCustomersMeAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerAddress.IUpdate;
}): Promise<IShoppingMallCustomerAddress> {
  // Verify address exists and belongs to customer
  const address =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findUniqueOrThrow({
      where: {
        id: props.addressId,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  // Update the address with provided fields
  await MyGlobal.prisma.shopping_mall_customer_addresses.update({
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
      updated_at: new Date(),
    },
  });
  // Fetch and return the updated address
  const updated =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      ...ShoppingMallCustomerAddressTransformer.select(),
    });
  return await ShoppingMallCustomerAddressTransformer.transform(updated);
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
// import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putShoppingMallCustomerCustomersMeAddressesAddressId(props: {
//   customer: CustomerPayload;
//   addressId: string & tags.Format<"uuid">;
//   body: IShoppingMallCustomerAddress.IUpdate;
// }): Promise<IShoppingMallCustomerAddress> {
//   await MyGlobal.prisma.shopping_mall_customer_addresses.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.shopping_mall_customer_addresses.findUniqueOrThrow({
//     where: { ... },
//     ...ShoppingMallCustomerAddressTransformer.select(),
//   });
//   return await ShoppingMallCustomerAddressTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------