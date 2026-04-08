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
import { EcommerceMallCustomerAddressCollector } from "../collectors/EcommerceMallCustomerAddressCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallCustomerAddressTransformer } from "../transformers/EcommerceMallCustomerAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallMemberCustomerAddresses(props: {
  member: MemberPayload;
  body: IEcommerceMallCustomerAddress.ICreate;
}): Promise<IEcommerceMallCustomerAddress> {
  if (props.body.is_default === true) {
    await MyGlobal.prisma.ecommerce_mall_customer_addresses.updateMany({
      where: {
        ecommerce_mall_member_id: props.member.id,
        is_default: true,
        deleted_at: null,
      },
      data: {
        is_default: false,
      },
    });
  }
  const record = await MyGlobal.prisma.ecommerce_mall_customer_addresses.create(
    {
      data: await EcommerceMallCustomerAddressCollector.collect({
        body: props.body,
        ecommerceMallMembers: {
          id: props.member.id,
        },
      }),
      ...EcommerceMallCustomerAddressTransformer.select(),
    },
  );
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
// export async function postEcommerceMallMemberCustomerAddresses(props: {
//   member: MemberPayload;
//   body: IEcommerceMallCustomerAddress.ICreate;
// }): Promise<IEcommerceMallCustomerAddress> {
//   const record = await MyGlobal.prisma.ecommerce_mall_customer_addresses.create({
//     data: await EcommerceMallCustomerAddressCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallCustomerAddressTransformer.select(),
//   });
//   return await EcommerceMallCustomerAddressTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------