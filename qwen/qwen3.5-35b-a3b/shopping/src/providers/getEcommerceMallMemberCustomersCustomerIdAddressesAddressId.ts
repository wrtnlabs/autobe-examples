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

export async function getEcommerceMallMemberCustomersCustomerIdAddressesAddressId(props: {
  member: MemberPayload;
  customerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCustomerAddress> {
  if (props.member.id !== props.customerId) {
    throw new HttpException("Not found", 404);
  }
  const record =
    await MyGlobal.prisma.ecommerce_mall_customer_addresses.findFirstOrThrow({
      ...EcommerceMallCustomerAddressTransformer.select(),
      where: {
        id: props.addressId,
        deleted_at: null,
        ecommerce_mall_member_id: props.customerId,
      },
    });
  return await EcommerceMallCustomerAddressTransformer.transform(record);
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
// export async function getEcommerceMallMemberCustomersCustomerIdAddressesAddressId(props: {
//   member: MemberPayload;
//   customerId: string & tags.Format<"uuid">;
//   addressId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallCustomerAddress> {
//   const record = await MyGlobal.prisma.ecommerce_mall_customer_addresses.findFirstOrThrow({
//     ...EcommerceMallCustomerAddressTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCustomerAddressTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------