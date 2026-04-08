import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformShippingAddressTransformer } from "../transformers/MallPlatformShippingAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformCustomerShippingAddressesShippingAddressIdDefault(props: {
  customer: CustomerPayload;
  shippingAddressId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformShippingAddress> {
  const target =
    await MyGlobal.prisma.mall_platform_shipping_addresses.findUniqueOrThrow({
      where: {
        id: props.shippingAddressId,
      },
      select: {
        id: true,
        customer_id: true,
      },
    });
  if (target.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_shipping_addresses.updateMany({
      where: {
        customer_id: props.customer.id,
        is_default: true,
        NOT: {
          id: props.shippingAddressId,
        },
      },
      data: {
        is_default: false,
      },
    });
    await prisma.mall_platform_shipping_addresses.update({
      where: {
        id: props.shippingAddressId,
      },
      data: {
        is_default: true,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.mall_platform_shipping_addresses.findUniqueOrThrow({
      where: {
        id: props.shippingAddressId,
      },
      ...MallPlatformShippingAddressTransformer.select(),
    });
  return await MallPlatformShippingAddressTransformer.transform(updated);
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
// import { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putMallPlatformCustomerShippingAddressesShippingAddressIdDefault(props: {
//   customer: CustomerPayload;
//   shippingAddressId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformShippingAddress> {
//   await MyGlobal.prisma.mall_platform_shipping_addresses.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.mall_platform_shipping_addresses.findUniqueOrThrow({
//     where: { ... },
//     ...MallPlatformShippingAddressTransformer.select(),
//   });
//   return await MallPlatformShippingAddressTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------