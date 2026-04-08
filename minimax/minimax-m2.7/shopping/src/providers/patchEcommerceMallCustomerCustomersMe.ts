import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCustomerProfileTransformer } from "../transformers/EcommerceMallCustomerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerCustomersMe(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCustomerProfile.IUpdate;
}): Promise<IEcommerceMallCustomerProfile> {
  await MyGlobal.prisma.ecommerce_mall_customer_profiles.findUniqueOrThrow({
    where: { ecommerce_mall_customer_id: props.customer.id },
  });
  const updated = await MyGlobal.prisma.ecommerce_mall_customer_profiles.update(
    {
      where: { ecommerce_mall_customer_id: props.customer.id },
      data: {
        display_name: props.body.display_name,
        phone: props.body.phone,
        updated_at: new Date(),
      },
      ...EcommerceMallCustomerProfileTransformer.select(),
    },
  );
  return await EcommerceMallCustomerProfileTransformer.transform(updated);
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
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerCustomersMe(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCustomerProfile.IUpdate;
// }): Promise<IEcommerceMallCustomerProfile> {
//   const record = await MyGlobal.prisma.ecommerce_mall_customer_profiles.findFirstOrThrow({
//     ...EcommerceMallCustomerProfileTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCustomerProfileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------