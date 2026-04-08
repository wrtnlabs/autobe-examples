import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformCustomerSessionTransformer } from "../transformers/MallPlatformCustomerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformCustomerSessions(props: {
  customer: CustomerPayload;
  body: IMallPlatformCustomerSession.ICreate;
}): Promise<IMallPlatformCustomerSession> {
  const customer =
    await MyGlobal.prisma.mall_platform_customers.findUniqueOrThrow({
      where: {
        id: props.customer.id,
      },
      select: {
        id: true,
        status: true,
      },
    });
  if (customer.status !== "ACTIVE") {
    throw new HttpException("Forbidden", 403);
  }
  const record = await MyGlobal.prisma.mall_platform_customer_sessions.create({
    data: {
      id: v4(),
      mall_platform_customer_id: props.customer.id,
      ip: "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new globalThis.Date(),
      expired_at: new globalThis.Date(
        globalThis.Date.now() + 1000 * 60 * 60 * 24 * 7,
      ),
    },
    ...MallPlatformCustomerSessionTransformer.select(),
  });
  return await MallPlatformCustomerSessionTransformer.transform(record);
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
// import { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformCustomerSessions(props: {
//   customer: CustomerPayload;
//   body: IMallPlatformCustomerSession.ICreate;
// }): Promise<IMallPlatformCustomerSession> {
//   const record = await MyGlobal.prisma.mall_platform_customer_sessions.create({
//     data: await MallPlatformCustomerSessionCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...MallPlatformCustomerSessionTransformer.select(),
//   });
//   return await MallPlatformCustomerSessionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------