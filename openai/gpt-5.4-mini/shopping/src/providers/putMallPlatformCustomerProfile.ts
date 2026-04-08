import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformCustomerProfileTransformer } from "../transformers/MallPlatformCustomerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformCustomerProfile(props: {
  customer: CustomerPayload;
  body: IMallPlatformCustomerProfile.IUpdate;
}): Promise<IMallPlatformCustomerProfile> {
  await MyGlobal.prisma.mall_platform_customer_profiles.update({
    where: {
      mall_platform_customer_id: props.customer.id,
    },
    data: {
      ...(props.body.displayName !== undefined
        ? { display_name: props.body.displayName }
        : {}),
      ...(props.body.phoneNumber !== undefined
        ? { phone_number: props.body.phoneNumber }
        : {}),
    },
  });
  const updated =
    await MyGlobal.prisma.mall_platform_customer_profiles.findUniqueOrThrow({
      where: {
        mall_platform_customer_id: props.customer.id,
      },
      ...MallPlatformCustomerProfileTransformer.select(),
    });
  return await MallPlatformCustomerProfileTransformer.transform(updated);
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
// import { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putMallPlatformCustomerProfile(props: {
//   customer: CustomerPayload;
//   body: IMallPlatformCustomerProfile.IUpdate;
// }): Promise<IMallPlatformCustomerProfile> {
//   await MyGlobal.prisma.mall_platform_customer_profiles.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.mall_platform_customer_profiles.findUniqueOrThrow({
//     where: { ... },
//     ...MallPlatformCustomerProfileTransformer.select(),
//   });
//   return await MallPlatformCustomerProfileTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------