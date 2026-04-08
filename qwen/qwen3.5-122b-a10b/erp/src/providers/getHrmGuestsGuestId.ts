import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmGuestTransformer } from "../transformers/HrmGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<IHrmGuest> {
  const whereInput = {
    id: props.guestId,
    deleted_at: null,
  } satisfies Prisma.hrm_guestsWhereInput;
  const record = await MyGlobal.prisma.hrm_guests.findFirstOrThrow({
    where: whereInput,
    ...HrmGuestTransformer.select(),
  });
  return await HrmGuestTransformer.transform(record);
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
// import { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
// import { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmGuestsGuestId(props: {
//   guestId: string & tags.Format<"uuid">;
// }): Promise<IHrmGuest> {
//   const record = await MyGlobal.prisma.hrm_guests.findFirstOrThrow({
//     ...HrmGuestTransformer.select(),
//     where: { ... },
//   });
//   return await HrmGuestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------