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

export async function patchMallPlatformCustomerShippingAddressesShippingAddressIdDefault(props: {
  customer: CustomerPayload;
  shippingAddressId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformShippingAddress> {
  const record =
    await MyGlobal.prisma.mall_platform_shipping_addresses.findFirstOrThrow({
      where: {
        id: props.shippingAddressId,
        customer_id: props.customer.id,
        deleted_at: null,
      },
      ...MallPlatformShippingAddressTransformer.select(),
    });
  if (record.is_default === true) {
    return await MallPlatformShippingAddressTransformer.transform(record);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_shipping_addresses.updateMany({
      where: {
        customer_id: props.customer.id,
        deleted_at: null,
        id: {
          not: props.shippingAddressId,
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
// export async function patchMallPlatformCustomerShippingAddressesShippingAddressIdDefault(props: {
//   customer: CustomerPayload;
//   shippingAddressId: string & tags.Format<"uuid">;
// }): Promise<IMallPlatformShippingAddress> {
//   const record = await MyGlobal.prisma.mall_platform_shipping_addresses.findFirstOrThrow({
//     ...MallPlatformShippingAddressTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformShippingAddressTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------