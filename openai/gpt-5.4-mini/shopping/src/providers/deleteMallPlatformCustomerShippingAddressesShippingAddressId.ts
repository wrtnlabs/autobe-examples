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

export async function deleteMallPlatformCustomerShippingAddressesShippingAddressId(props: {
  customer: CustomerPayload;
  shippingAddressId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const shippingAddress =
      await prisma.mall_platform_shipping_addresses.findUniqueOrThrow({
        where: {
          id: props.shippingAddressId,
        },
        select: {
          id: true,
          customer_id: true,
          is_default: true,
        },
      });
    if (shippingAddress.customer_id !== props.customer.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (shippingAddress.is_default) {
      await prisma.mall_platform_shipping_addresses.update({
        where: {
          id: shippingAddress.id,
        },
        data: {
          is_default: false,
        },
      });
    }
    await prisma.mall_platform_shipping_addresses.delete({
      where: {
        id: shippingAddress.id,
      },
    });
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteMallPlatformCustomerShippingAddressesShippingAddressId(props: {
//   customer: CustomerPayload;
//   shippingAddressId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------