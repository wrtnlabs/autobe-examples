import { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubGuestTransformer } from "../transformers/CommunityHubGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityHubGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<ICommunityHubGuest> {
  const record = await MyGlobal.prisma.community_hub_guests.findUniqueOrThrow({
    where: { id: props.guestId },
    ...CommunityHubGuestTransformer.select(),
  });
  return await CommunityHubGuestTransformer.transform(record);
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
// import { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getCommunityHubGuestsGuestId(props: {
//   guestId: string & tags.Format<"uuid">;
// }): Promise<ICommunityHubGuest> {
//   const record = await MyGlobal.prisma.community_hub_guests.findFirstOrThrow({
//     ...CommunityHubGuestTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityHubGuestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------