import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformGuestTransformer } from "../transformers/HrmPlatformGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformGuest> {
  const record = await MyGlobal.prisma.hrm_platform_guests.findUniqueOrThrow({
    ...HrmPlatformGuestTransformer.select(),
    where: { id: props.guestId },
  });
  return await HrmPlatformGuestTransformer.transform(record);
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
// import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformGuestsGuestId(props: {
//   guestId: string & tags.Format<"uuid">;
// }): Promise<IHrmPlatformGuest> {
//   const record = await MyGlobal.prisma.hrm_platform_guests.findFirstOrThrow({
//     ...HrmPlatformGuestTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformGuestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------