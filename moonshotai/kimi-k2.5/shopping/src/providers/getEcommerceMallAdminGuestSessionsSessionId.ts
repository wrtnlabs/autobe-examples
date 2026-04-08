import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallGuestSessionTransformer } from "../transformers/EcommerceMallGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminGuestSessionsSessionId(props: {
  admin: AdminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallGuestSession> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_guest_sessions.findUniqueOrThrow({
      ...EcommerceMallGuestSessionTransformer.select(),
      where: { id: props.sessionId },
    });
  return await EcommerceMallGuestSessionTransformer.transform(record);
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
// import { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
// import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdminGuestSessionsSessionId(props: {
//   admin: AdminPayload;
//   sessionId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallGuestSession> {
//   const record = await MyGlobal.prisma.ecommerce_mall_guest_sessions.findFirstOrThrow({
//     ...EcommerceMallGuestSessionTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallGuestSessionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------