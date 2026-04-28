import { IEcommercePlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformCustomerPassword(props: {
  customer: CustomerPayload;
  body: IEcommercePlatformCustomerPasswordReset.IChange;
}): Promise<void> {
  const customer =
    await MyGlobal.prisma.ecommerce_platform_customers.findUniqueOrThrow({
      where: { id: props.customer.id },
      select: { password_hash: true },
    });
  const valid = await PasswordUtil.verify(
    props.body.currentPassword,
    customer.password_hash,
  );
  if (valid !== true) {
    throw new HttpException("Current password is incorrect", 401);
  }
  if (props.body.newPassword === props.body.currentPassword) {
    throw new HttpException(
      "New password must differ from current password",
      400,
    );
  }
  const newPasswordHash = await PasswordUtil.hash(props.body.newPassword);
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_platform_customers.update({
      where: { id: props.customer.id },
      data: { password_hash: newPasswordHash },
    }),
    MyGlobal.prisma.ecommerce_platform_customer_sessions.updateMany({
      where: {
        customer: { id: props.customer.id },
        deleted_at: null,
      },
      data: {
        deleted_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
    }),
  ]);
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
// import { IEcommercePlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerPasswordReset";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformCustomerPassword(props: {
//   customer: CustomerPayload;
//   body: IEcommercePlatformCustomerPasswordReset.IChange;
// }): Promise<void> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------