import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallGuestTransformer } from "../transformers/ShoppingMallGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallGuest> {
  const record = await MyGlobal.prisma.shopping_mall_guests.findFirstOrThrow({
    ...ShoppingMallGuestTransformer.select(),
    where: {
      id: props.guestId,
      deleted_at: null,
    },
  });
  return await ShoppingMallGuestTransformer.transform(record);
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
// import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallGuestsGuestId(props: {
//   guestId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallGuest> {
//   const record = await MyGlobal.prisma.shopping_mall_guests.findFirstOrThrow({
//     ...ShoppingMallGuestTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallGuestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------