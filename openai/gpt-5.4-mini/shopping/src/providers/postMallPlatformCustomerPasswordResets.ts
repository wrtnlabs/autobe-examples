import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformCustomerPasswordResetCollector } from "../collectors/MallPlatformCustomerPasswordResetCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformCustomerPasswordResetTransformer } from "../transformers/MallPlatformCustomerPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformCustomerPasswordResets(props: {
  customer: CustomerPayload;
  body: IMallPlatformCustomerPasswordReset.ICreate;
}): Promise<IMallPlatformCustomerPasswordReset> {
  const customer =
    await MyGlobal.prisma.mall_platform_customers.findUniqueOrThrow({
      where: {
        id: props.body.mall_platform_customer_id,
      },
      select: {
        id: true,
      },
    });
  if (customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const record =
    await MyGlobal.prisma.mall_platform_customer_password_resets.create({
      data: await MallPlatformCustomerPasswordResetCollector.collect({
        body: props.body,
      }),
      ...MallPlatformCustomerPasswordResetTransformer.select(),
    });
  return await MallPlatformCustomerPasswordResetTransformer.transform(record);
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
// import { IMallPlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerPasswordReset";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformCustomerPasswordResets(props: {
//   customer: CustomerPayload;
//   body: IMallPlatformCustomerPasswordReset.ICreate;
// }): Promise<IMallPlatformCustomerPasswordReset> {
//   const record = await MyGlobal.prisma.mall_platform_customer_password_resets.create({
//     data: await MallPlatformCustomerPasswordResetCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...MallPlatformCustomerPasswordResetTransformer.select(),
//   });
//   return await MallPlatformCustomerPasswordResetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------