import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallGuestTransformer } from "../transformers/EcommerceMallGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminGuestsGuestId(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallGuest> {
  const record = await MyGlobal.prisma.ecommerce_mall_guests.findFirstOrThrow({
    where: {
      id: props.guestId,
      deleted_at: null,
    },
    ...EcommerceMallGuestTransformer.select(),
  });
  return await EcommerceMallGuestTransformer.transform(record);
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
// import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdminGuestsGuestId(props: {
//   admin: AdminPayload;
//   guestId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallGuest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_guests.findFirstOrThrow({
//     ...EcommerceMallGuestTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallGuestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------