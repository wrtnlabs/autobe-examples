import { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformGuestTransformer } from "../transformers/EcommercePlatformGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommercePlatformGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformGuest> {
  const record =
    await MyGlobal.prisma.ecommerce_platform_guests.findUniqueOrThrow({
      where: {
        id: props.guestId,
      },
      ...EcommercePlatformGuestTransformer.select(),
    });
  return await EcommercePlatformGuestTransformer.transform(record);
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
// import { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommercePlatformGuestsGuestId(props: {
//   guestId: string & tags.Format<"uuid">;
// }): Promise<IEcommercePlatformGuest> {
//   const record = await MyGlobal.prisma.ecommerce_platform_guests.findFirstOrThrow({
//     ...EcommercePlatformGuestTransformer.select(),
//     where: { ... },
//   });
//   return await EcommercePlatformGuestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------