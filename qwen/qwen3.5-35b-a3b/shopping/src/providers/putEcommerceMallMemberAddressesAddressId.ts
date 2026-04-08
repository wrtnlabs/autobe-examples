import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallCustomerAddressTransformer } from "../transformers/EcommerceMallCustomerAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallMemberAddressesAddressId(props: {
  member: MemberPayload;
  addressId: string & tags.Format<"uuid">;
  body: IEcommerceMallCustomerAddress.IUpdate;
}): Promise<IEcommerceMallCustomerAddress> {
  // 1. Find and validate address exists, not soft-deleted
  const address =
    await MyGlobal.prisma.ecommerce_mall_customer_addresses.findUniqueOrThrow({
      where: {
        id: props.addressId,
        deleted_at: null,
      },
      select: {
        id: true,
        ecommerce_mall_member_id: true,
      },
    });
  // 2. Verify ownership
  if (address.ecommerce_mall_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Handle single-default constraint
  if (props.body.is_default === true) {
    await MyGlobal.prisma.ecommerce_mall_customer_addresses.updateMany({
      where: {
        ecommerce_mall_member_id: props.member.id,
        is_default: true,
        id: { not: props.addressId },
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    });
  }
  // 4. Build partial update data
  const updateData: {
    recipient_name?: string;
    phone?: string;
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    is_default?: boolean;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.recipient_name !== undefined) {
    updateData.recipient_name = props.body.recipient_name;
  }
  if (props.body.phone !== undefined) {
    updateData.phone = props.body.phone;
  }
  if (props.body.street !== undefined) {
    updateData.street = props.body.street;
  }
  if (props.body.city !== undefined) {
    updateData.city = props.body.city;
  }
  if (props.body.state !== undefined) {
    updateData.state = props.body.state;
  }
  if (props.body.postal_code !== undefined) {
    updateData.postal_code = props.body.postal_code;
  }
  if (props.body.country !== undefined) {
    updateData.country = props.body.country;
  }
  if (props.body.is_default !== undefined) {
    updateData.is_default = props.body.is_default;
  }
  // 5. Update the address
  await MyGlobal.prisma.ecommerce_mall_customer_addresses.update({
    where: { id: props.addressId },
    data: updateData,
  });
  // 6. Fetch full updated address with transformer select
  const updated =
    await MyGlobal.prisma.ecommerce_mall_customer_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      ...EcommerceMallCustomerAddressTransformer.select(),
    });
  // 7. Transform and return
  return await EcommerceMallCustomerAddressTransformer.transform(updated);
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
// import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallMemberAddressesAddressId(props: {
//   member: MemberPayload;
//   addressId: string & tags.Format<"uuid">;
//   body: IEcommerceMallCustomerAddress.IUpdate;
// }): Promise<IEcommerceMallCustomerAddress> {
//   await MyGlobal.prisma.ecommerce_mall_customer_addresses.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_customer_addresses.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallCustomerAddressTransformer.select(),
//   });
//   return await EcommerceMallCustomerAddressTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------