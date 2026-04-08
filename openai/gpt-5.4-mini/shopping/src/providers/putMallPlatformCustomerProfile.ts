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
  const profile =
    await MyGlobal.prisma.mall_platform_customer_profiles.findFirst({
      where: {
        mall_platform_customer_id: props.customer.id,
        deleted_at: null,
      },
      select: {
        id: true,
        display_name: true,
        phone_number: true,
      },
    });
  if (profile === null) {
    throw new HttpException("Customer profile not found", 404);
  }
  if (
    props.body.displayName !== undefined &&
    props.body.displayName.trim().length === 0
  ) {
    throw new HttpException("Invalid profile information", 400);
  }
  if (
    props.body.phoneNumber !== undefined &&
    props.body.phoneNumber.trim().length === 0
  ) {
    throw new HttpException("Invalid profile information", 400);
  }
  await MyGlobal.prisma.mall_platform_customer_profiles.update({
    where: {
      id: profile.id,
    },
    data: {
      display_name: props.body.displayName ?? profile.display_name,
      phone_number: props.body.phoneNumber ?? profile.phone_number,
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.mall_platform_customer_profiles.findUniqueOrThrow({
      where: {
        id: profile.id,
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