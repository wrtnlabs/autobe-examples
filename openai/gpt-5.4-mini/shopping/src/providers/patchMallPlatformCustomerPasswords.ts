import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformCustomerPasswordResetTransformer } from "../transformers/MallPlatformCustomerPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerPasswords(props: {
  customer: CustomerPayload;
  body: IMallPlatformCustomerPasswordReset.IUpdate;
}): Promise<IMallPlatformCustomerPasswordReset> {
  const customer =
    await MyGlobal.prisma.mall_platform_customers.findUniqueOrThrow({
      where: {
        id: props.customer.id,
      },
      select: {
        id: true,
        password_hash: true,
      },
    });
  const currentMatches = props.body.currentPassword === customer.password_hash;
  if (!currentMatches) {
    throw new HttpException("Current password is incorrect", 400);
  }
  const newMatches = props.body.newPassword === customer.password_hash;
  if (newMatches) {
    throw new HttpException("New password must be different", 400);
  }
  const hashedPassword = await PasswordUtil.hash(props.body.newPassword);
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_customers.update({
      where: {
        id: props.customer.id,
      },
      data: {
        password_hash: hashedPassword,
      },
    });
  });
  const record =
    await MyGlobal.prisma.mall_platform_customer_password_resets.findFirstOrThrow(
      {
        ...MallPlatformCustomerPasswordResetTransformer.select(),
        where: {
          mall_platform_customer_id: props.customer.id,
        },
        orderBy: {
          created_at: "desc",
        },
      },
    );
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
// export async function patchMallPlatformCustomerPasswords(props: {
//   customer: CustomerPayload;
//   body: IMallPlatformCustomerPasswordReset.IUpdate;
// }): Promise<IMallPlatformCustomerPasswordReset> {
//   const record = await MyGlobal.prisma.mall_platform_customer_password_resets.findFirstOrThrow({
//     ...MallPlatformCustomerPasswordResetTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformCustomerPasswordResetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------