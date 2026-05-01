import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallGuestSessionTransformer } from "../transformers/ShoppingMallGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminGuestsGuestIdSessionsSessionId(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallGuestSession> {
  const guest = await MyGlobal.prisma.shopping_mall_guests.findFirst({
    where: {
      id: props.guestId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (guest === null) {
    throw new HttpException("Guest not found", 404);
  }
  const session =
    await MyGlobal.prisma.shopping_mall_guest_sessions.findFirstOrThrow({
      ...ShoppingMallGuestSessionTransformer.select(),
      where: {
        id: props.sessionId,
        shopping_mall_guest_id: props.guestId,
      },
    });
  return await ShoppingMallGuestSessionTransformer.transform(session);
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
// import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
// import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallAdminGuestsGuestIdSessionsSessionId(props: {
//   admin: AdminPayload;
//   guestId: string & tags.Format<"uuid">;
//   sessionId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallGuestSession> {
//   const record = await MyGlobal.prisma.shopping_mall_guest_sessions.findFirstOrThrow({
//     ...ShoppingMallGuestSessionTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallGuestSessionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------